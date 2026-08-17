-- ============================================================================
-- 0017: seed.sql's restaurant_tables insert predates position_x/position_y
-- (0014) and was already applied to this hosted project before that column
-- existed, so the floor-plan layout never got its coordinates. Idempotent
-- by label — safe to re-run.
-- ============================================================================

update public.restaurant_tables set position_x = 40, position_y = 40 where label = 'T-01';
update public.restaurant_tables set position_x = 200, position_y = 40 where label = 'T-02';
update public.restaurant_tables set position_x = 40, position_y = 180 where label = 'T-03';
update public.restaurant_tables set position_x = 200, position_y = 180 where label = 'T-04';
update public.restaurant_tables set position_x = 120, position_y = 320 where label = 'T-05';
