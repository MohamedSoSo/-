-- ============================================================================
-- 0008: Combo/Platter builder. A combo is a menu_items row (item_type =
-- 'combo') with N slots (combo_components), each slot scoped to a category
-- so the customer substitutes only within sensible bounds (e.g. "choose your
-- meat" can't be swapped for a drink).
-- ============================================================================

create type public.menu_item_type as enum ('single', 'combo');

alter table public.menu_items
  add column item_type public.menu_item_type not null default 'single';

create table public.combo_components (
  id uuid primary key default gen_random_uuid(),
  combo_menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  slot_label text not null, -- e.g. "Choose your meat"
  category_id uuid not null references public.categories (id), -- scopes valid substitutes
  quantity int not null default 1 check (quantity > 0),
  upcharge numeric(10, 2) not null default 0,
  sort_order int not null default 0
);

create index combo_components_combo_idx on public.combo_components (combo_menu_item_id);

-- snapshot of what the customer actually picked per slot on a placed order
create table public.order_item_components (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade, -- the combo line item
  combo_component_id uuid references public.combo_components (id) on delete set null,
  slot_label text not null,
  component_menu_item_id uuid not null references public.menu_items (id),
  quantity int not null default 1 check (quantity > 0),
  upcharge_snapshot numeric(10, 2) not null default 0
);

create index order_item_components_order_item_idx on public.order_item_components (order_item_id);
