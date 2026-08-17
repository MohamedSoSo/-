-- ============================================================================
-- 0027: PIN brute-force rate limiting. Real rate limiting for these RPCs
-- can't live in Next.js middleware — the browser calls Supabase directly,
-- never through our server (a deliberate architecture choice across every
-- phase), so there's no request our middleware ever sees to throttle. This
-- has to be enforced in Postgres instead, keyed on the caller's terminal
-- session (auth.uid()) since verify_staff_pin/void_order_item/apply_discount
-- all require `to authenticated` already — a stolen/shared terminal session
-- is the actual attack surface a 4-6 digit PIN needs defending against.
-- ============================================================================

create table public.pin_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null,
  created_at timestamptz not null default now()
);

create index pin_verification_attempts_caller_idx on public.pin_verification_attempts (caller_id, created_at);

-- no RLS policies granting client access at all: only the SECURITY DEFINER
-- function below ever touches this table.
alter table public.pin_verification_attempts enable row level security;

create function public.check_and_record_pin_attempt()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent_count int;
begin
  select count(*) into v_recent_count
    from public.pin_verification_attempts
    where caller_id = auth.uid() and created_at > now() - interval '60 seconds';

  if v_recent_count >= 10 then
    raise exception 'RATE_LIMITED: too many PIN attempts from this terminal — wait a moment and try again';
  end if;

  insert into public.pin_verification_attempts (caller_id) values (auth.uid());
end;
$$;

create or replace function public.verify_staff_pin(p_pin text)
returns table (profile_id uuid, display_name text, role public.app_role)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_record_pin_attempt();

  return query
    select p.id, p.display_name, p.role
    from public.profiles p
    where p.pin_hash is not null
      and p.is_active
      and p.deleted_at is null
      and crypt(p_pin, p.pin_hash) = p.pin_hash
    limit 1;
end;
$$;

create or replace function public.void_order_item(p_order_item_id uuid, p_reason text, p_supervisor_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_supervisor record;
  v_modifiers_total numeric(10, 2);
  v_components_total numeric(10, 2);
  v_line_total numeric(10, 2);
  v_new_subtotal numeric(10, 2);
  v_new_tax numeric(10, 2);
begin
  perform public.check_and_record_pin_attempt();

  select p.id, p.role into v_supervisor
    from public.profiles p
    where p.pin_hash is not null and p.is_active and p.deleted_at is null
      and crypt(p_supervisor_pin, p.pin_hash) = p.pin_hash
    limit 1;

  if not found or v_supervisor.role not in ('owner', 'developer') then
    raise exception 'SUPERVISOR_PIN_INVALID';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'ORDER_ITEM_NOT_FOUND: %', p_order_item_id;
  end if;

  if v_item.status = 'voided' then
    raise exception 'ALREADY_VOIDED: %', p_order_item_id;
  end if;

  if v_item.station = 'grill' and v_item.status in ('grilling', 'kitchen_prep', 'plating', 'ready', 'served') then
    insert into public.inventory_waste (menu_item_id, order_item_id, weight_grams, quantity, reason, notes, staff_id)
    values (
      v_item.menu_item_id, v_item.id,
      coalesce(v_item.weight_grams_actual, v_item.weight_grams_ordered),
      v_item.quantity, 'voided_after_cook', p_reason, auth.uid()
    );
  end if;

  select coalesce(sum(price_delta_snapshot * v_item.quantity), 0) into v_modifiers_total
    from public.order_item_modifiers where order_item_id = v_item.id;

  select coalesce(sum(upcharge_snapshot * quantity * v_item.quantity), 0) into v_components_total
    from public.order_item_components where order_item_id = v_item.id;

  v_line_total := v_item.line_total + v_modifiers_total + v_components_total;

  update public.order_items set status = 'voided' where id = p_order_item_id;

  select greatest(subtotal - v_line_total, 0) into v_new_subtotal from public.orders where id = v_item.order_id;
  v_new_tax := round(v_new_subtotal * 0.15, 2);

  update public.orders
    set subtotal = v_new_subtotal, tax_total = v_new_tax,
        grand_total = greatest(v_new_subtotal + v_new_tax - discount_total, 0)
    where id = v_item.order_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after, reason)
  values (
    auth.uid(), public.current_role(), 'void_transaction', 'order_items', p_order_item_id::text,
    jsonb_build_object('status', v_item.status),
    jsonb_build_object('status', 'voided', 'approved_by', v_supervisor.id),
    p_reason
  );
end;
$$;

create or replace function public.apply_discount(
  p_order_id uuid, p_discount_amount numeric, p_reason text, p_supervisor_pin text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supervisor record;
  v_order record;
begin
  perform public.check_and_record_pin_attempt();

  if p_discount_amount <= 0 then
    raise exception 'INVALID_DISCOUNT: must be positive';
  end if;

  select p.id, p.role into v_supervisor
    from public.profiles p
    where p.pin_hash is not null and p.is_active and p.deleted_at is null
      and crypt(p_supervisor_pin, p.pin_hash) = p.pin_hash
    limit 1;

  if not found or v_supervisor.role not in ('owner', 'developer') then
    raise exception 'SUPERVISOR_PIN_INVALID';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  if p_discount_amount > (v_order.subtotal + v_order.tax_total - v_order.discount_total) then
    raise exception 'DISCOUNT_EXCEEDS_TOTAL';
  end if;

  update public.orders
    set discount_total = discount_total + p_discount_amount,
        grand_total = greatest(subtotal + tax_total - (discount_total + p_discount_amount), 0)
    where id = p_order_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after, reason)
  values (
    auth.uid(), public.current_role(), 'discount_applied', 'orders', p_order_id::text,
    jsonb_build_object('discount_total', v_order.discount_total),
    jsonb_build_object('discount_total', v_order.discount_total + p_discount_amount, 'approved_by', v_supervisor.id),
    p_reason
  );
end;
$$;
