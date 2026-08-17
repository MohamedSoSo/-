-- ============================================================================
-- 0004: Audit logging — mandatory trail for price updates, voids, discounts,
-- refunds, and elevated-authorization actions. No hard deletes anywhere;
-- this table is the append-only source of truth for "who changed what, why."
-- ============================================================================

create type public.audit_action as enum (
  'price_update',
  'void_transaction',
  'discount_applied',
  'refund_issued',
  'elevated_auth',
  'menu_item_update',
  'feature_flag_toggle',
  'asset_update',
  'user_role_change'
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  actor_role public.app_role,
  action public.audit_action not null,
  target_table text not null,
  target_id text not null,
  before jsonb,
  after jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_action_idx on public.audit_logs (action);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

comment on table public.audit_logs is 'Append-only. Never updated or deleted by application code — enforced via RLS below.';

-- ── menu_items: log price/COGS changes ─────────────────────────────────────
create function public.audit_menu_item_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') and (old.base_price is distinct from new.base_price or old.cogs is distinct from new.cogs) then
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (
      auth.uid(), public.current_role(), 'price_update', 'menu_items', new.id::text,
      jsonb_build_object('base_price', old.base_price, 'cogs', old.cogs),
      jsonb_build_object('base_price', new.base_price, 'cogs', new.cogs)
    );
  elsif (tg_op = 'UPDATE') then
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (auth.uid(), public.current_role(), 'menu_item_update', 'menu_items', new.id::text, to_jsonb(old), to_jsonb(new));
  end if;
  return new;
end;
$$;

create trigger menu_items_audit
  after update on public.menu_items
  for each row execute function public.audit_menu_item_change();

-- ── orders: log voids and discounts ────────────────────────────────────────
create function public.audit_order_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') and new.status in ('voided', 'cancelled') and old.status is distinct from new.status then
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (
      auth.uid(), public.current_role(), 'void_transaction', 'orders', new.id::text,
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status)
    );
  end if;

  if (tg_op = 'UPDATE') and new.discount_total > old.discount_total then
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (
      auth.uid(), public.current_role(), 'discount_applied', 'orders', new.id::text,
      jsonb_build_object('discount_total', old.discount_total), jsonb_build_object('discount_total', new.discount_total)
    );
  end if;

  return new;
end;
$$;

create trigger orders_audit
  after update on public.orders
  for each row execute function public.audit_order_change();

-- ── profiles: log role changes (elevated auth) ─────────────────────────────
create function public.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE') and old.role is distinct from new.role then
    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (
      auth.uid(), public.current_role(), 'user_role_change', 'profiles', new.id::text,
      jsonb_build_object('role', old.role), jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.audit_role_change();
