-- ============================================================================
-- 0019: RLS for Phase 4 tables. Ingredient costs are owner/developer-only —
-- supplier pricing is sensitive and customers/most staff have no reason to
-- see it. Status events are staff-writable (self-attributed only) and
-- staff/management-readable.
-- ============================================================================

alter table public.ingredients enable row level security;
alter table public.menu_item_ingredients enable row level security;

grant select on public.ingredients, public.menu_item_ingredients to authenticated;
grant insert, update, delete on public.ingredients, public.menu_item_ingredients to authenticated;

create policy ingredients_management_all on public.ingredients
  for all to authenticated using (public.is_management()) with check (public.is_management());
create policy menu_item_ingredients_management_all on public.menu_item_ingredients
  for all to authenticated using (public.is_management()) with check (public.is_management());

alter table public.order_item_status_events enable row level security;
grant select, insert on public.order_item_status_events to authenticated;

create policy order_item_status_events_staff_read on public.order_item_status_events
  for select to authenticated
  using (public.is_staff());

-- staff can only log events under their own name — prevents attributing
-- (or hiding) a status change as/from someone else.
create policy order_item_status_events_self_insert on public.order_item_status_events
  for insert to authenticated
  with check (public.is_staff() and (staff_id = auth.uid() or staff_id is null));
