-- ============================================================================
-- 0010: Free-text delivery address + notes. delivery_lat/lng and
-- scheduled_for already exist from 0003.
-- ============================================================================

alter table public.orders
  add column delivery_address_line text,
  add column delivery_notes text;
