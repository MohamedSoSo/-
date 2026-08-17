-- Local dev seed data. Run automatically by `supabase db reset`.
-- Does NOT create auth users — sign up locally via the app or Supabase
-- Studio (http://127.0.0.1:54323), then promote the account:
--   update public.profiles set role = 'developer' where id = '<user-uuid>';

insert into public.categories (id, name_en, name_ar, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Grilled Meats', 'مشاوي', 1),
  ('00000000-0000-0000-0000-000000000002', 'Starters', 'مقبلات', 2),
  ('00000000-0000-0000-0000-000000000003', 'Beverages', 'مشروبات', 3);

insert into public.menu_items
  (id, name_en, name_ar, description_en, category_id, base_price, is_weight_based, default_weight_unit, supports_doneness, available_doneness_levels, cogs, is_active)
values
  ('00000000-0000-0000-0000-000000000101', 'Wagyu Tomahawk', 'توماهوك واغيو',
   'Dry-aged wagyu tomahawk, charcoal grilled to order.', '00000000-0000-0000-0000-000000000001',
   0, true, 'g', true, '{medium_rare,medium,medium_well,well_done}', 0, true),
  ('00000000-0000-0000-0000-000000000102', 'Lamb Chops', 'ريش غنم',
   'Marinated lamb chops, sumac & za''atar rub.', '00000000-0000-0000-0000-000000000001',
   0, true, 'g', true, '{medium,medium_well,well_done}', 0, true),
  ('00000000-0000-0000-0000-000000000103', 'Grilled Halloumi', 'حلوم مشوي',
   'Charred halloumi with pomegranate molasses.', '00000000-0000-0000-0000-000000000002',
   45.00, false, 'g', false, '{}', 18.00, true);

insert into public.weight_tiers (menu_item_id, label, grams, price_multiplier, sort_order) values
  ('00000000-0000-0000-0000-000000000101', '250g', 250, 1, 1),
  ('00000000-0000-0000-0000-000000000101', '500g', 500, 1.9, 2),
  ('00000000-0000-0000-0000-000000000101', '1kg', 1000, 3.6, 3),
  ('00000000-0000-0000-0000-000000000102', '250g', 250, 1, 1),
  ('00000000-0000-0000-0000-000000000102', '500g', 500, 1.85, 2);

-- price the tomahawk/lamb per-250g base so weight_multiplier math is meaningful
update public.menu_items set base_price = 180.00, cogs = 95.00 where id = '00000000-0000-0000-0000-000000000101';
update public.menu_items set base_price = 120.00, cogs = 62.00 where id = '00000000-0000-0000-0000-000000000102';

-- stations + stock: weight-based grill items stay unmetered (null), the
-- discrete halloumi starter and the beverage get a real stock count.
update public.menu_items set default_station = 'grill' where id in
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000102');
update public.menu_items set default_station = 'kitchen', stock_quantity = 40 where id =
  '00000000-0000-0000-0000-000000000103';

insert into public.menu_items
  (id, name_en, name_ar, description_en, category_id, base_price, is_weight_based, default_station, cogs, is_active, stock_quantity)
values
  ('00000000-0000-0000-0000-000000000104', 'Mint Lemonade', 'ليمون بالنعناع',
   'Fresh mint, lime, sparkling water.', '00000000-0000-0000-0000-000000000003',
   18.00, false, 'bar', 5.00, true, 100);

-- ── combo/platter: "Grill Master Feast" — meat + side + drink slots ───────
insert into public.menu_items
  (id, name_en, name_ar, description_en, category_id, base_price, is_weight_based, default_station, item_type, cogs, is_active)
values
  ('00000000-0000-0000-0000-000000000105', 'Grill Master Feast', 'وليمة سيد المشاوي',
   'Build your own feast: pick your meat, side, and drink.', '00000000-0000-0000-0000-000000000001',
   150.00, false, 'grill', 'combo', 78.00, true);

insert into public.combo_components (id, combo_menu_item_id, slot_label, category_id, quantity, upcharge, sort_order) values
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000105', 'Choose your meat', '00000000-0000-0000-0000-000000000001', 1, 0, 1),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000105', 'Choose your side', '00000000-0000-0000-0000-000000000002', 1, 0, 2),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000105', 'Choose your drink', '00000000-0000-0000-0000-000000000003', 1, 0, 3);

-- ── modifiers: sauce (required, single) + extra sides (optional, multi) ───
insert into public.modifier_groups (id, name_en, name_ar, selection_type, is_required, min_select, max_select) values
  ('00000000-0000-0000-0000-000000000201', 'Sauce', 'الصلصة', 'single', true, 1, 1),
  ('00000000-0000-0000-0000-000000000202', 'Extra Sides', 'إضافات جانبية', 'multiple', false, 0, 3);

insert into public.modifiers (id, group_id, name_en, name_ar, price_delta, sort_order) values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'Garlic Toum', 'ثوم', 0, 1),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000201', 'Chili Harissa', 'هريسة حارة', 0, 2),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000201', 'BBQ Smoke', 'صلصة الشواء', 0, 3),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000202', 'Grilled Corn', 'ذرة مشوية', 12.00, 1),
  ('00000000-0000-0000-0000-000000000305', '00000000-0000-0000-0000-000000000202', 'Extra Fries', 'بطاطس إضافية', 10.00, 2),
  ('00000000-0000-0000-0000-000000000306', '00000000-0000-0000-0000-000000000202', 'Coleslaw', 'كول سلو', 8.00, 3);

insert into public.menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201', 1),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000202', 2),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000201', 1),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', 2),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000202', 1);

insert into public.restaurant_tables (label, seats, position_x, position_y) values
  ('T-01', 2, 40, 40), ('T-02', 2, 200, 40), ('T-03', 4, 40, 180), ('T-04', 4, 200, 180), ('T-05', 6, 120, 320);

insert into public.feature_flags (key, enabled, description, rollout_percentage) values
  ('delivery_tracking', true, 'Live map tracking for delivery orders', 100),
  ('pre_orders', true, 'Allow scheduling orders ahead of pickup/dine-in time', 100),
  ('offline_pos', true, 'PWA offline mode with IndexedDB sync for POS/KDS', 100),
  ('web_serial_scale', false, 'Electronic scale integration via Web Serial API', 0);

insert into public.theme_tokens (key, tokens) values
  ('customer', '{"--brand-bg": "#120c08", "--brand-accent": "#e8792f", "--brand-surface": "#1e140d"}'),
  ('pos', '{"--brand-bg": "#0d0f12", "--brand-accent": "#3fae60", "--brand-surface": "#161a1f"}'),
  ('bi', '{"--brand-bg": "#0b0e14", "--brand-accent": "#4f8cff", "--brand-surface": "#151a24"}'),
  ('admin', '{"--brand-bg": "#0a0a0c", "--brand-accent": "#9d5cff", "--brand-surface": "#151318"}');

-- ── Phase 4: raw-ingredient costing + expected thermal shrinkage ──────────
update public.categories set expected_shrinkage_pct = 0.220 where id = '00000000-0000-0000-0000-000000000001';

insert into public.ingredients (id, name_en, name_ar, unit_cost_per_kg) values
  ('00000000-0000-0000-0000-000000000501', 'Wagyu Beef', 'لحم واغيو', 220.00),
  ('00000000-0000-0000-0000-000000000502', 'Lamb', 'لحم غنم', 140.00);

-- kg_per_unit matches the 250g base tier each item is priced against.
insert into public.menu_item_ingredients (menu_item_id, ingredient_id, kg_per_unit) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000501', 0.250),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000502', 0.250);
