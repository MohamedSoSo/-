-- ============================================================================
-- 0014: Phase 3 schema — staff PINs, shifts, petty cash, floor plan status,
-- payments (multi-tender per order), inventory waste, ZATCA invoice fields
-- with a post-signature immutability lock.
-- ============================================================================

-- ── staff PIN (fast-switch identity, NOT the RLS security boundary — see
-- 0016's verify_staff_pin comment) ──────────────────────────────────────────
alter table public.profiles
  add column pin_hash text,
  add column pin_set_at timestamptz;

-- pin_hash must never be readable via the normal REST API, even for a staff
-- member's own row or a coworker's row that profiles_select already exposes.
-- Only SECURITY DEFINER functions (which bypass column privileges via the
-- function owner) can read it.
revoke select (pin_hash) on public.profiles from anon, authenticated;

-- ── shifts + petty cash ─────────────────────────────────────────────────────
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  cashier_id uuid not null references public.profiles (id),
  status public.shift_status not null default 'open',
  opening_balance numeric(10, 2) not null check (opening_balance >= 0),
  closing_balance_expected numeric(10, 2),
  closing_balance_counted numeric(10, 2),
  cash_variance numeric(10, 2),
  notes text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create index shifts_cashier_idx on public.shifts (cashier_id);
create unique index shifts_one_open_per_cashier on public.shifts (cashier_id) where status = 'open';

create table public.petty_cash_entries (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  reason text not null,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index petty_cash_entries_shift_idx on public.petty_cash_entries (shift_id);

-- ── floor plan ───────────────────────────────────────────────────────────
alter table public.restaurant_tables
  add column status public.table_status not null default 'free',
  add column position_x int not null default 0,
  add column position_y int not null default 0;

-- ── payments: multiple tenders per order (split bill) ──────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  method public.payment_method not null,
  amount numeric(10, 2) not null check (amount > 0),
  is_refund boolean not null default false,
  tendered_by uuid references public.profiles (id),
  shift_id uuid references public.shifts (id),
  reference text, -- gateway/terminal reference, or null for cash
  created_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);
create index payments_shift_idx on public.payments (shift_id);

-- ── inventory waste ─────────────────────────────────────────────────────
create table public.inventory_waste (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id),
  order_item_id uuid references public.order_items (id), -- null for manually-logged waste
  weight_grams int check (weight_grams > 0), -- null for non-weight-based items
  quantity int not null default 1 check (quantity > 0),
  reason public.waste_reason not null,
  notes text,
  staff_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_waste_menu_item_idx on public.inventory_waste (menu_item_id);
create index inventory_waste_created_at_idx on public.inventory_waste (created_at desc);

-- ── ZATCA fields + post-signature immutability ─────────────────────────────
create type public.zatca_signature_status as enum ('unsigned', 'signed_stub', 'signed');

alter table public.orders
  add column zatca_xml text,
  add column zatca_signature_status public.zatca_signature_status not null default 'unsigned',
  add column zatca_signed_at timestamptz;

comment on column public.orders.zatca_signature_status is
  'signed_stub = this deployment has no real ZATCA CSID certificate; QR/XML are structurally correct but the cryptographic stamp (QR tag 7-9) is a placeholder. See apps/pos/lib/zatca/signing-adapter.ts.';

create function public.enforce_zatca_immutability()
returns trigger
language plpgsql
as $$
begin
  if old.zatca_signed_at is not null and (
    new.subtotal is distinct from old.subtotal or
    new.tax_total is distinct from old.tax_total or
    new.discount_total is distinct from old.discount_total or
    new.grand_total is distinct from old.grand_total
  ) then
    raise exception 'ZATCA_LOCKED: order % was invoiced at % — financial fields are immutable. Issue a credit note instead.', old.id, old.zatca_signed_at;
  end if;
  return new;
end;
$$;

create trigger orders_zatca_immutability
  before update on public.orders
  for each row execute function public.enforce_zatca_immutability();
