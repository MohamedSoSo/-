-- ============================================================================
-- 0009: Stock/inventory for discrete (non-weight-based) items, and a default
-- KDS station per menu item so place_order() can route order_items without
-- guessing. Weight-based grilled meats stay unmetered here by design — kg-
-- on-hand tracking is a kitchen/yield concern (Phase 3/4), not a checkout
-- concern; see menu_items_stock_weight_check below.
-- ============================================================================

alter table public.menu_items
  add column default_station public.station not null default 'kitchen',
  add column stock_quantity int,
  add column stock_version int not null default 0;

alter table public.menu_items
  add constraint menu_items_stock_weight_check
  check (not is_weight_based or stock_quantity is null);

alter table public.menu_items
  add constraint menu_items_stock_nonnegative_check
  check (stock_quantity is null or stock_quantity >= 0);

comment on column public.menu_items.stock_quantity is
  'null = unmetered (unlimited / weight-based). Decremented atomically by place_order() via a guarded UPDATE (stock_quantity >= qty), not a separate read-then-write, to avoid a race between the check and the write.';
