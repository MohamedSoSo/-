-- ============================================================================
-- 0003: Order domain — orders, order_items
-- ============================================================================

create type public.order_channel as enum ('qr_table', 'delivery', 'pickup', 'pre_order');

create type public.order_status as enum (
  'placed', 'confirmed', 'grilling', 'kitchen_prep', 'plating',
  'ready', 'served', 'out_for_delivery', 'delivered', 'completed',
  'cancelled', 'voided'
);

create type public.station as enum ('grill', 'kitchen', 'bar', 'dessert');

create sequence public.order_number_seq;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('BBQ-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  channel public.order_channel not null,
  status public.order_status not null default 'placed',
  table_id uuid references public.restaurant_tables (id),
  customer_id uuid references public.profiles (id),
  driver_id uuid references public.profiles (id),
  subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  discount_total numeric(10, 2) not null default 0 check (discount_total >= 0),
  tax_total numeric(10, 2) not null default 0 check (tax_total >= 0), -- ZATCA VAT
  grand_total numeric(10, 2) not null default 0 check (grand_total >= 0),
  zatca_invoice_uuid uuid,
  zatca_qr_payload text,
  scheduled_for timestamptz, -- pre-orders
  delivery_lat double precision,
  delivery_lng double precision,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete: financial records are never hard-deleted
);

create index orders_status_idx on public.orders (status) where deleted_at is null;
create index orders_customer_idx on public.orders (customer_id) where deleted_at is null;
create index orders_driver_idx on public.orders (driver_id) where deleted_at is null;
create index orders_placed_at_idx on public.orders (placed_at desc);

create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  station public.station not null,
  quantity int not null check (quantity > 0),
  weight_grams_ordered int check (weight_grams_ordered > 0),
  weight_grams_actual int check (weight_grams_actual > 0), -- post-grill scale reading -> yield/meat-loss tracking
  doneness public.doneness_level,
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  notes text,
  status public.order_status not null default 'placed',
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_station_status_idx on public.order_items (station, status);

-- realtime powers the KDS live screen split (grill vs kitchen) and delivery tracking
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
