-- ============================================================================
-- 0011: RLS for Phase 2 tables — same pattern as 0006: public read on menu
-- config, management write, no direct client writes on order-history tables
-- (those are populated exclusively by the place_order() SECURITY DEFINER
-- RPC in 0012, same append-only principle as audit_logs).
-- ============================================================================

-- ── modifier_groups / modifiers / menu_item_modifier_groups ───────────────
alter table public.modifier_groups enable row level security;
alter table public.modifiers enable row level security;
alter table public.menu_item_modifier_groups enable row level security;

grant select on public.modifier_groups, public.modifiers, public.menu_item_modifier_groups to anon, authenticated;
grant insert, update, delete on public.modifier_groups, public.modifiers, public.menu_item_modifier_groups to authenticated;

create policy modifier_groups_public_read on public.modifier_groups for select to anon, authenticated using (true);
create policy modifiers_public_read on public.modifiers for select to anon, authenticated using (is_active = true);
create policy modifiers_staff_read_all on public.modifiers for select to authenticated using (public.is_staff());
create policy menu_item_modifier_groups_public_read on public.menu_item_modifier_groups for select to anon, authenticated using (true);

create policy modifier_groups_management_write on public.modifier_groups
  for all to authenticated using (public.is_management()) with check (public.is_management());
create policy modifiers_management_write on public.modifiers
  for all to authenticated using (public.is_management()) with check (public.is_management());
create policy menu_item_modifier_groups_management_write on public.menu_item_modifier_groups
  for all to authenticated using (public.is_management()) with check (public.is_management());

-- ── combo_components ────────────────────────────────────────────────────
alter table public.combo_components enable row level security;
grant select on public.combo_components to anon, authenticated;
grant insert, update, delete on public.combo_components to authenticated;

create policy combo_components_public_read on public.combo_components for select to anon, authenticated using (true);
create policy combo_components_management_write on public.combo_components
  for all to authenticated using (public.is_management()) with check (public.is_management());

-- ── order_item_modifiers / order_item_components: read-only for clients,
-- rows are written exclusively by place_order() (SECURITY DEFINER) ────────
alter table public.order_item_modifiers enable row level security;
alter table public.order_item_components enable row level security;

grant select on public.order_item_modifiers, public.order_item_components to anon, authenticated;

create policy order_item_modifiers_select on public.order_item_modifiers
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_modifiers.order_item_id
        and (o.customer_id = auth.uid() or o.driver_id = auth.uid())
    )
  );

create policy order_item_components_select on public.order_item_components
  for select to anon, authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = order_item_components.order_item_id
        and (o.customer_id = auth.uid() or o.driver_id = auth.uid())
    )
  );
