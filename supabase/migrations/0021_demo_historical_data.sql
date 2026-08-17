-- ============================================================================
-- 0021: Synthetic historical data (past 30 days) so the Phase 4 BI dashboard
-- has real patterns to visualize instead of empty states — no real orders
-- had been placed through the apps yet at the time this was written.
--
-- Clearly identifiable/removable later via:
--   delete from public.orders
--     where placed_at::date between current_date - 29 and current_date;
--   -- (cascades to order_items/payments/order_item_status_events via FK)
--   delete from public.inventory_waste where created_at::date between current_date - 29 and current_date;
--   delete from public.shifts where opened_at::date between current_date - 13 and current_date;
--
-- Idempotency: NOT idempotent — re-running this file adds a second batch of
-- demo orders. It's written as a plain migration (not wrapped in a
-- conflict-safe upsert) because historical demo rows have no natural unique
-- key; run it once.
-- ============================================================================

do $$
declare
  v_day date;
  v_dow int;
  v_is_weekend boolean;
  v_order_count int;
  v_i int;
  v_hour int;
  v_minute int;
  v_placed_at timestamptz;
  v_channel public.order_channel;
  v_customer_id uuid;
  v_table_id uuid;
  v_order_id uuid;
  v_status public.order_status;
  v_item_count int;
  v_j int;
  v_menu_item record;
  v_weight_tier record;
  v_qty int;
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_subtotal numeric(10, 2);
  v_tax numeric(10, 2);
  v_grand numeric(10, 2);
  v_order_item_id uuid;
  v_item_status public.order_status;
  v_weight_ordered int;
  v_weight_actual int;
  v_shrink numeric;
  v_staff_id uuid;
  v_customer_ids uuid[];
  v_staff_ids uuid[];
  v_table_ids uuid[];
  v_payment_method public.payment_method;
  v_orders_created int := 0;
begin
  select array_agg(id) into v_customer_ids from public.profiles where role = 'customer' and is_active;
  select array_agg(id) into v_staff_ids
    from public.profiles where role in ('cashier', 'grill_chef', 'kitchen_chef', 'waiter') and is_active;
  select array_agg(id) into v_table_ids from public.restaurant_tables where is_active;

  if v_table_ids is null then
    raise notice 'No restaurant_tables found — skipping demo order generation.';
  else
    for v_day in select generate_series(current_date - interval '29 days', current_date, interval '1 day')::date loop
      v_dow := extract(dow from v_day);
      v_is_weekend := v_dow in (5, 6); -- Fri/Sat weekend in KSA
      v_order_count := (case when v_is_weekend then 28 else 15 end) + floor(random() * 12)::int;

      for v_i in 1..v_order_count loop
        v_hour := case
          when random() < 0.40 then 12 + floor(random() * 4)::int -- lunch 12-15
          when random() < 0.85 then 18 + floor(random() * 5)::int -- dinner 18-22
          else 10 + floor(random() * 13)::int
        end;
        v_minute := floor(random() * 60)::int;
        v_placed_at := v_day + (v_hour * interval '1 hour') + (v_minute * interval '1 minute');
        if v_placed_at > now() then continue; end if;

        v_channel := (array['qr_table', 'qr_table', 'pickup', 'pickup', 'delivery', 'pre_order']::public.order_channel[])
          [1 + floor(random() * 6)::int];
        v_table_id := case when v_channel = 'qr_table' then v_table_ids[1 + floor(random() * array_length(v_table_ids, 1))::int] else null end;
        v_customer_id := case when v_customer_ids is not null and random() < 0.5
          then v_customer_ids[1 + floor(random() * array_length(v_customer_ids, 1))::int] else null end;
        v_staff_id := case when v_staff_ids is not null
          then v_staff_ids[1 + floor(random() * array_length(v_staff_ids, 1))::int] else null end;

        v_status := case
          when random() < 0.94 then 'completed'::public.order_status
          when random() < 0.5 then 'cancelled'::public.order_status
          else 'voided'::public.order_status
        end;

        insert into public.orders (channel, status, table_id, customer_id, placed_at, updated_at, subtotal, tax_total, grand_total)
        values (v_channel, v_status, v_table_id, v_customer_id, v_placed_at, v_placed_at, 0, 0, 0)
        returning id into v_order_id;

        v_subtotal := 0;
        v_item_count := 1 + floor(random() * 3)::int;

        for v_j in 1..v_item_count loop
          select id, base_price, is_weight_based, default_station
            into v_menu_item
            from public.menu_items
            where deleted_at is null and item_type = 'single'
            order by random()
            limit 1;

          exit when not found;

          v_qty := 1 + floor(random() * 2)::int;
          v_weight_ordered := null;
          v_weight_actual := null;
          v_unit_price := v_menu_item.base_price;

          if v_menu_item.is_weight_based then
            select grams, price_multiplier into v_weight_tier
              from public.weight_tiers where menu_item_id = v_menu_item.id order by random() limit 1;

            if found then
              v_weight_ordered := v_weight_tier.grams;
              v_unit_price := round(v_menu_item.base_price * v_weight_tier.price_multiplier, 2);
              -- expected ~22% thermal shrinkage +/- noise; ~8% of items run
              -- an extra unaccounted loss on top, feeding the yield-analytics narrative
              v_shrink := 0.22 + (random() * 0.06 - 0.03);
              if random() < 0.08 then
                v_shrink := v_shrink + 0.08 + random() * 0.10;
              end if;
              v_weight_actual := greatest(round(v_weight_ordered * (1 - v_shrink))::int, 1);
            end if;
          end if;

          v_line_total := v_unit_price * v_qty;
          v_subtotal := v_subtotal + v_line_total;

          v_item_status := v_status;
          if v_status = 'completed' and random() < 0.03 then
            v_item_status := 'voided';
          end if;

          insert into public.order_items
            (order_id, menu_item_id, station, quantity, weight_grams_ordered, weight_grams_actual, unit_price, line_total, status, created_at)
          values
            (v_order_id, v_menu_item.id, v_menu_item.default_station, v_qty, v_weight_ordered, v_weight_actual, v_unit_price, v_line_total, v_item_status, v_placed_at)
          returning id into v_order_item_id;

          if v_menu_item.default_station = 'grill' and v_staff_id is not null then
            insert into public.order_item_status_events (order_item_id, from_status, to_status, staff_id, created_at) values
              (v_order_item_id, 'placed', 'grilling', v_staff_id, v_placed_at + (1 + floor(random() * 3))::int * interval '1 minute'),
              (v_order_item_id, 'grilling', 'ready', v_staff_id, v_placed_at + (4 + floor(random() * 10))::int * interval '1 minute');
          end if;

          if v_menu_item.default_station = 'grill' and v_staff_id is not null and random() < 0.02 then
            insert into public.inventory_waste (menu_item_id, weight_grams, quantity, reason, staff_id, created_at)
            values (
              v_menu_item.id, coalesce(v_weight_ordered, 200), 1,
              (array['dropped', 'quality_reject']::public.waste_reason[])[1 + floor(random() * 2)::int],
              v_staff_id, v_placed_at
            );
          end if;
        end loop;

        v_tax := round(v_subtotal * 0.15, 2);
        v_grand := v_subtotal + v_tax;

        update public.orders set subtotal = v_subtotal, tax_total = v_tax, grand_total = v_grand where id = v_order_id;

        if v_status = 'completed' then
          v_payment_method := (array['cash', 'card', 'card', 'apple_pay', 'terminal']::public.payment_method[])[1 + floor(random() * 5)::int];
          insert into public.payments (order_id, method, amount, tendered_by, created_at)
          values (v_order_id, v_payment_method, v_grand, v_staff_id, v_placed_at);
        end if;

        v_orders_created := v_orders_created + 1;
      end loop;
    end loop;
  end if;

  -- ── a couple of weeks of shift history for the Z-report drilldown ───────
  if v_staff_ids is not null then
    for v_day in select generate_series(current_date - interval '13 days', current_date - interval '1 day', interval '1 day')::date loop
      for v_i in 1..least(array_length(v_staff_ids, 1), 2) loop
        declare
          v_opening numeric(10, 2) := 200 + floor(random() * 300);
          v_variance numeric(10, 2) := round((random() * 30 - 15)::numeric, 2);
          v_opened_at timestamptz := v_day + interval '11 hours';
          v_closed_at timestamptz := v_day + interval '23 hours';
          v_expected numeric(10, 2);
        begin
          v_expected := v_opening + 400 + floor(random() * 800);
          insert into public.shifts
            (cashier_id, status, opening_balance, closing_balance_expected, closing_balance_counted, cash_variance, opened_at, closed_at)
          values (
            v_staff_ids[v_i], 'closed', v_opening, v_expected, v_expected + v_variance, v_variance, v_opened_at, v_closed_at
          );
        end;
      end loop;
    end loop;
  end if;

  raise notice 'Demo data generation complete: % orders created.', v_orders_created;
end $$;
