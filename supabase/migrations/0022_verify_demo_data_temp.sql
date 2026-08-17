-- Temporary: writes row counts into a throwaway feature_flags row (publicly
-- readable) so they can be checked via the REST API without psql/Docker.
-- Removed by 0023 immediately after verification.
do $$
declare
  v_orders int; v_items int; v_payments int; v_shifts int; v_waste int; v_events int;
begin
  select count(*) into v_orders from public.orders;
  select count(*) into v_items from public.order_items;
  select count(*) into v_payments from public.payments;
  select count(*) into v_shifts from public.shifts;
  select count(*) into v_waste from public.inventory_waste;
  select count(*) into v_events from public.order_item_status_events;

  insert into public.feature_flags (key, enabled, description)
  values (
    '_debug_demo_data_count', false,
    format('orders=%s items=%s payments=%s shifts=%s waste=%s events=%s', v_orders, v_items, v_payments, v_shifts, v_waste, v_events)
  )
  on conflict (key) do update set description = excluded.description;
end $$;
