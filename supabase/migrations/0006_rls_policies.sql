-- ============================================================================
-- 0006: Row Level Security — Zero Trust default-deny on every table.
-- RLS restricts *rows*; base GRANTs restrict *operations*. Both are required:
-- a GRANT without a matching policy still returns zero rows (safe default),
-- but we grant explicitly per table so intent is auditable here in one file.
-- ============================================================================

create function public.is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'developer';
$$;

-- ── profiles ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
grant select, update on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_management());

-- role escalation must go through management; a customer editing their own
-- display_name/phone cannot smuggle a role change in the same UPDATE.
create function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_management() then
    raise exception 'role changes require owner or developer privileges';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role_change();

-- ── categories ───────────────────────────────────────────────────────────
alter table public.categories enable row level security;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

create policy categories_public_read on public.categories
  for select to anon, authenticated
  using (deleted_at is null);

create policy categories_management_write on public.categories
  for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- ── menu_items ───────────────────────────────────────────────────────────
alter table public.menu_items enable row level security;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

create policy menu_items_public_read on public.menu_items
  for select to anon, authenticated
  using (deleted_at is null and is_active = true);

create policy menu_items_staff_read_all on public.menu_items
  for select to authenticated
  using (public.is_staff()); -- staff must see inactive/86'd items too

create policy menu_items_management_write on public.menu_items
  for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- ── weight_tiers ─────────────────────────────────────────────────────────
alter table public.weight_tiers enable row level security;
grant select on public.weight_tiers to anon, authenticated;
grant insert, update, delete on public.weight_tiers to authenticated;

create policy weight_tiers_public_read on public.weight_tiers
  for select to anon, authenticated
  using (true);

create policy weight_tiers_management_write on public.weight_tiers
  for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- ── restaurant_tables ────────────────────────────────────────────────────
alter table public.restaurant_tables enable row level security;
grant select on public.restaurant_tables to anon, authenticated;
grant insert, update, delete on public.restaurant_tables to authenticated;

create policy restaurant_tables_public_read on public.restaurant_tables
  for select to anon, authenticated
  using (is_active = true);

create policy restaurant_tables_management_write on public.restaurant_tables
  for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- ── orders ───────────────────────────────────────────────────────────────
alter table public.orders enable row level security;
grant select, insert on public.orders to anon, authenticated;
grant update on public.orders to authenticated;

create policy orders_select on public.orders
  for select to anon, authenticated
  using (
    (customer_id is not null and customer_id = auth.uid())
    or driver_id = auth.uid()
    or public.is_staff()
  );

-- anon covers QR-table guest checkout (no login); customer_id is null there.
-- authenticated customers must stamp their own id, staff may place orders for walk-ins.
create policy orders_insert on public.orders
  for insert to anon, authenticated
  with check (
    (customer_id is null and channel = 'qr_table')
    or customer_id = auth.uid()
    or public.is_staff()
  );

-- no direct customer UPDATE: cancellations/edits go through a SECURITY DEFINER
-- RPC so business rules (e.g. no edits after 'grilling') are enforced server-side.
create policy orders_update_staff on public.orders
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- no delete policy anywhere on orders: soft delete only, via deleted_at.

-- ── order_items ──────────────────────────────────────────────────────────
alter table public.order_items enable row level security;
grant select, insert on public.order_items to anon, authenticated;
grant update on public.order_items to authenticated;

create policy order_items_select on public.order_items
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or o.driver_id = auth.uid())
    )
  );

create policy order_items_insert on public.order_items
  for insert to anon, authenticated
  with check (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.customer_id = auth.uid() or (o.customer_id is null and o.channel = 'qr_table'))
    )
  );

create policy order_items_update_staff on public.order_items
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── audit_logs: append-only, management-read-only, no client inserts ──────
alter table public.audit_logs enable row level security;
grant select on public.audit_logs to authenticated;
-- no insert/update/delete GRANT to anon/authenticated at all: rows are
-- written exclusively by the SECURITY DEFINER audit triggers above.

create policy audit_logs_management_read on public.audit_logs
  for select to authenticated
  using (public.is_management());

-- ── feature_flags / brand_assets / theme_tokens (Developer Portal) ────────
alter table public.feature_flags enable row level security;
alter table public.brand_assets enable row level security;
alter table public.theme_tokens enable row level security;

grant select on public.feature_flags, public.brand_assets, public.theme_tokens to anon, authenticated;
grant insert, update, delete on public.feature_flags, public.brand_assets, public.theme_tokens to authenticated;

create policy feature_flags_public_read on public.feature_flags for select to anon, authenticated using (true);
create policy brand_assets_public_read on public.brand_assets for select to anon, authenticated using (true);
create policy theme_tokens_public_read on public.theme_tokens for select to anon, authenticated using (true);

-- writes are developer-only: owner can VIEW business config but the
-- Developer Portal itself (logos, colors, API creds, flags) is a technical
-- surface gated to the 'developer' role, per the spec's role separation.
create policy feature_flags_developer_write on public.feature_flags
  for all to authenticated using (public.is_developer()) with check (public.is_developer());
create policy brand_assets_developer_write on public.brand_assets
  for all to authenticated using (public.is_developer()) with check (public.is_developer());
create policy theme_tokens_developer_write on public.theme_tokens
  for all to authenticated using (public.is_developer()) with check (public.is_developer());
