-- ============================================================================
-- 0032: Phase 4 — real per-item images + is_featured, for the new admin
-- catalog UI (apps/admin/admin/catalog) and the customer-facing featured
-- section.
--
-- IMAGE STORAGE DECISION: menu_items.image_asset_key already existed (since
-- 0002) but was dead — apps/customer/components/MenuBrowser.tsx never read
-- it, every card unconditionally rendered the one shared generic
-- placeholder. Confirmed via grep before touching anything: this column is
-- referenced ONLY in apps/customer (menu-data.ts, reorder.ts, cart-store.ts,
-- ComboBuilderSheet.tsx, ItemCustomizeSheet.tsx — all just pass the value
-- through, none render it) — apps/pos and apps/bi never reference it, so
-- changing its meaning is safe.
--
-- Renamed to image_path and repurposed to hold a direct Supabase Storage
-- object path (resolved with a plain getPublicUrl call), NOT a brand_assets
-- key. Deliberately NOT reusing the ASSET_KEYS/<AppImage /> system from
-- packages/ui/src/assets.config.ts for this: that registry is a small,
-- fixed, compile-time-known set of brand-wide singleton assets (one logo,
-- one hero image, etc.) resolved by a TS const object — it has no mechanism
-- for "one row per arbitrary menu item," and forcing hundreds of dynamic
-- per-item keys through it would mean either a giant runtime-generated
-- ASSET_KEYS-like map (defeats the point of it being a fixed compile-time
-- registry) or hundreds of rows in brand_assets (a table modeled around a
-- handful of named singletons, not a catalog). A plain storage path column,
-- resolved directly against a dedicated bucket, is the correct fit and is
-- how apps/customer will render it going forward (Item 4).
--
-- CATEGORIES: no image column added. This design's category browser
-- (MenuBrowser.tsx) is a simple text-pill row with no image slot — adding
-- an upload path for imagery nothing renders would just recreate the exact
-- "effectively dead column" problem this migration is fixing for menu_items.
-- If category photography becomes part of the design later, add the column
-- then, alongside the UI that actually displays it.
--
-- IS_FEATURED: a single boolean, not a dated promotions table. This
-- restaurant's scale doesn't need scheduled campaigns — an owner flips it
-- on/off manually — and a boolean is trivially upgradable to a real
-- promotions table later without a breaking migration if that ever changes.
--
-- RLS: no new policies needed. categories_management_write and
-- menu_items_management_write (0006) are already `for all` row-level
-- policies gated on is_management() — they apply to every column,
-- including the ones added here, automatically. Only a new Storage bucket
-- needs its own policies (mirrors 0024's brand-assets bucket pattern,
-- except gated on is_management() to match menu_items/categories' existing
-- write tier, not is_developer() — that role is specific to the Developer
-- Portal's brand-level config, a different concern from catalog editing).
-- ============================================================================

alter table public.menu_items rename column image_asset_key to image_path;

comment on column public.menu_items.image_path is
  'Object path within the catalog-images Storage bucket, resolved via a plain getPublicUrl call — not a brand_assets/<AppImage /> key. Null = no per-item image set; UI falls back to the shared generic placeholder.';

alter table public.menu_items
  add column is_featured boolean not null default false;

create index menu_items_featured_idx on public.menu_items (is_featured)
  where deleted_at is null and is_active = true;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);

create policy catalog_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'catalog-images');

create policy catalog_images_management_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog-images' and public.is_management());

create policy catalog_images_management_update on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog-images' and public.is_management())
  with check (bucket_id = 'catalog-images' and public.is_management());

create policy catalog_images_management_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog-images' and public.is_management());
