-- ============================================================================
-- 0020: applies seed.sql's Phase 4 additions to this already-seeded hosted
-- project (same reasoning as 0017's table-position fixup — seed.sql only
-- auto-runs on `supabase db reset`, which this hosted project never gets).
-- ============================================================================

update public.categories set expected_shrinkage_pct = 0.220 where id = '00000000-0000-0000-0000-000000000001';

insert into public.ingredients (id, name_en, name_ar, unit_cost_per_kg) values
  ('00000000-0000-0000-0000-000000000501', 'Wagyu Beef', 'لحم واغيو', 220.00),
  ('00000000-0000-0000-0000-000000000502', 'Lamb', 'لحم غنم', 140.00)
on conflict (id) do nothing;

insert into public.menu_item_ingredients (menu_item_id, ingredient_id, kg_per_unit) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000501', 0.250),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000502', 0.250)
on conflict (menu_item_id, ingredient_id) do nothing;
