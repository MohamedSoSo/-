-- ============================================================================
-- 0015: RLS for Phase 3 tables. Money-moving writes (opening/closing a
-- shift, petty cash, payments, waste) go through SECURITY DEFINER RPCs in
-- 0016 — no direct INSERT/UPDATE grants to anon/authenticated on those
-- tables, same append-only-via-RPC principle as place_order() in Phase 2.
-- ============================================================================

-- ── shifts ───────────────────────────────────────────────────────────────
alter table public.shifts enable row level security;
grant select on public.shifts to authenticated;

create policy shifts_staff_read on public.shifts
  for select to authenticated
  using (public.is_staff());

-- ── petty_cash_entries ──────────────────────────────────────────────────
alter table public.petty_cash_entries enable row level security;
grant select on public.petty_cash_entries to authenticated;

create policy petty_cash_staff_read on public.petty_cash_entries
  for select to authenticated
  using (public.is_staff());

-- ── restaurant_tables: staff can move/status-update the floor plan ────────
create policy restaurant_tables_staff_update on public.restaurant_tables
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- ── payments ────────────────────────────────────────────────────────────
alter table public.payments enable row level security;
grant select on public.payments to authenticated;

create policy payments_staff_read on public.payments
  for select to authenticated
  using (public.is_staff());

-- ── inventory_waste ─────────────────────────────────────────────────────
alter table public.inventory_waste enable row level security;
grant select on public.inventory_waste to authenticated;

create policy inventory_waste_staff_read on public.inventory_waste
  for select to authenticated
  using (public.is_staff());
