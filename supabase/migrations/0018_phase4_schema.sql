-- ============================================================================
-- 0018: Phase 4 schema — raw-ingredient costing (dynamic COGS), expected
-- thermal shrinkage per category (yield analytics), and a status-change log
-- so KDS staff performance/velocity metrics are attributable rather than
-- guessed. None of this existed before Phase 4 because nothing needed it
-- until BI had to compute real numbers instead of showing empty states.
-- ============================================================================

-- ── expected thermal shrinkage: distinguishes "meat always loses ~20%
-- cooking" from "this order lost 40%, something's wrong" ──────────────────
alter table public.categories
  add column expected_shrinkage_pct numeric(4, 3); -- e.g. 0.220 = 22%, null = not a meat category

-- ── raw ingredients + what each menu item consumes, so editing one supplier
-- price recalculates every dependent item's margin ─────────────────────────
create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  unit_cost_per_kg numeric(10, 2) not null check (unit_cost_per_kg >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.menu_item_ingredients (
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete restrict,
  kg_per_unit numeric(8, 4) not null check (kg_per_unit > 0), -- raw kg consumed per base unit sold, pre-shrinkage
  primary key (menu_item_id, ingredient_id)
);

create trigger ingredients_touch_updated_at
  before update on public.ingredients
  for each row execute function public.touch_updated_at();

-- ── KDS status-change log: who advanced what, when. Backs grill velocity /
-- chef prep-speed metrics — without this, "staff performance" would be
-- fabricated rather than measured. ─────────────────────────────────────────
create table public.order_item_status_events (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  staff_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index order_item_status_events_item_idx on public.order_item_status_events (order_item_id);
create index order_item_status_events_staff_idx on public.order_item_status_events (staff_id);
create index order_item_status_events_created_at_idx on public.order_item_status_events (created_at);
