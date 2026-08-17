-- ============================================================================
-- 0013: Phase 3 enum additions. Kept in its own migration/transaction —
-- Postgres won't let a newly-added enum value be used by a statement in the
-- same transaction that added it, so every later Phase 3 migration that
-- references these values must run in a later file.
-- ============================================================================

alter type public.audit_action add value 'table_transfer';
alter type public.audit_action add value 'order_merge';
alter type public.audit_action add value 'no_sale_drawer_open';
alter type public.audit_action add value 'shift_close';
alter type public.audit_action add value 'inventory_waste';

create type public.table_status as enum ('free', 'occupied', 'reserved', 'needs_cleaning');

create type public.payment_method as enum ('card', 'apple_pay', 'cash', 'terminal');

create type public.shift_status as enum ('open', 'closed');

create type public.waste_reason as enum (
  'voided_after_cook',
  'dropped',
  'quality_reject',
  'expired',
  'other'
);
