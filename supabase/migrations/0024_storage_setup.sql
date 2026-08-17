-- ============================================================================
-- 0024: Storage bucket for Developer Portal-managed brand assets. Referenced
-- since Phase 1 (packages/ui/src/assets.config.ts: BRAND_ASSETS_BUCKET) but
-- never actually created — <AppImage /> has been silently falling back to
-- bundled local defaults this whole time.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-assets', 'brand-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/x-icon']);

-- public read (AppImage resolves public URLs client-side for every app,
-- including anonymous customer sessions)
create policy brand_assets_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'brand-assets');

-- developer-only write, matching the brand_assets table's RLS (0006)
create policy brand_assets_developer_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'brand-assets' and public.is_developer());

create policy brand_assets_developer_update on storage.objects
  for update to authenticated
  using (bucket_id = 'brand-assets' and public.is_developer())
  with check (bucket_id = 'brand-assets' and public.is_developer());

create policy brand_assets_developer_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'brand-assets' and public.is_developer());
