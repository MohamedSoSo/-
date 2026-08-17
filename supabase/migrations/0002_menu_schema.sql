-- ============================================================================
-- 0002: Menu domain — categories, menu_items, weight_tiers
-- ============================================================================

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create type public.weight_unit as enum ('g', 'kg');

create type public.doneness_level as enum (
  'rare', 'medium_rare', 'medium', 'medium_well', 'well_done'
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  description_en text,
  description_ar text,
  category_id uuid not null references public.categories (id) on delete restrict,
  base_price numeric(10, 2) not null check (base_price >= 0),
  is_weight_based boolean not null default false,
  default_weight_unit public.weight_unit not null default 'g',
  supports_doneness boolean not null default false,
  available_doneness_levels public.doneness_level[] not null default '{}',
  cogs numeric(10, 2) not null default 0 check (cogs >= 0), -- feeds Owner BI dynamic COGS + BCG matrix
  image_asset_key text, -- resolved by <AppImage /> via assets.config.ts
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete: menu items are never hard-deleted (historical orders reference them)
);

create index menu_items_category_idx on public.menu_items (category_id) where deleted_at is null;
create index menu_items_active_idx on public.menu_items (is_active) where deleted_at is null;
create index menu_items_name_trgm_idx on public.menu_items using gin (name_en gin_trgm_ops);

create trigger menu_items_touch_updated_at
  before update on public.menu_items
  for each row execute function public.touch_updated_at();

create table public.weight_tiers (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  label text not null, -- e.g. "250g", "500g", "1kg"
  grams int not null check (grams > 0),
  price_multiplier numeric(6, 3) not null default 1 check (price_multiplier > 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index weight_tiers_menu_item_idx on public.weight_tiers (menu_item_id);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null unique, -- e.g. "T-12"
  qr_code_token uuid not null default gen_random_uuid() unique,
  seats int not null default 2,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
