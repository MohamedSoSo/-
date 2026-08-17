-- ============================================================================
-- 0007: Modifiers — bread/sauce/extra-side style add-ons. Doneness stays a
-- first-class column on order_items (0003); this is for everything else.
-- ============================================================================

create type public.modifier_selection_type as enum ('single', 'multiple');

create table public.modifier_groups (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null,
  selection_type public.modifier_selection_type not null default 'single',
  is_required boolean not null default false,
  min_select int not null default 0,
  max_select int not null default 1,
  created_at timestamptz not null default now(),
  check (min_select >= 0 and max_select >= min_select)
);

create table public.modifiers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.modifier_groups (id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  price_delta numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create index modifiers_group_idx on public.modifiers (group_id);

-- which modifier groups apply to which menu items (many-to-many)
create table public.menu_item_modifier_groups (
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  modifier_group_id uuid not null references public.modifier_groups (id) on delete cascade,
  sort_order int not null default 0,
  primary key (menu_item_id, modifier_group_id)
);

-- selections captured on a placed order — snapshotted so later menu edits
-- (price/rename/retire a modifier) never rewrite order history.
create table public.order_item_modifiers (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  modifier_id uuid references public.modifiers (id) on delete set null,
  name_snapshot text not null,
  price_delta_snapshot numeric(10, 2) not null,
  quantity int not null default 1 check (quantity > 0)
);

create index order_item_modifiers_order_item_idx on public.order_item_modifiers (order_item_id);
