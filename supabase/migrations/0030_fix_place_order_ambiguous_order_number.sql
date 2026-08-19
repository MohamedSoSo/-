-- ============================================================================
-- 0030: Bug fix, not a Phase 2 rate-limiting change. Discovered during live
-- verification of 0028: place_order() has always failed at runtime with
-- "column reference \"order_number\" is ambiguous" (pre-existing since
-- 0012_place_order.sql — this codebase apparently never exercised a real
-- end-to-end checkout call before now).
--
-- Root cause: `returns table (order_id uuid, order_number text)` implicitly
-- declares plpgsql variables named order_id/order_number in the function's
-- scope, alongside the actual `orders.order_number` column. The unqualified
-- `returning id, order_number into v_order_id, v_order_number` can't tell
-- which `order_number` it means. `order_id` doesn't collide (the column is
-- `orders.id`, not `orders.order_id`), so only the one reference needs
-- qualifying.
--
-- Fix is exactly one token: qualify the RETURNING column with the table
-- name. No ordering/pricing/inventory logic changes, no signature change —
-- create or replace against the identical 9-arg signature 0028 created.
-- ============================================================================

create or replace function public.place_order(
  p_channel public.order_channel,
  p_table_id uuid,
  p_scheduled_for timestamptz,
  p_delivery_address text,
  p_delivery_lat double precision,
  p_delivery_lng double precision,
  p_delivery_notes text,
  p_items jsonb,
  p_client_ip text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_number text;
  v_customer_id uuid := auth.uid();
  v_item jsonb;
  v_menu_item record;
  v_qty int;
  v_weight_tier_id uuid;
  v_weight_tier_grams int;
  v_weight_tier_multiplier numeric;
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_tax numeric(10, 2);
  v_grand numeric(10, 2);
  v_order_item_id uuid;
  v_modifier record;
  v_modifier_id uuid;
  v_combo_sel jsonb;
  v_component record;
  v_updated_stock int;
begin
  -- staff (POS) terminals are authenticated and call this RPC directly —
  -- exempt them by role rather than IP, since they were never the guest-
  -- abuse threat this guards against, and it keeps apps/pos's call site
  -- unchanged (it never passes p_client_ip).
  if not public.is_staff() then
    perform public.check_and_record_place_order_rate_limit(p_client_ip);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_EMPTY: at least one item is required';
  end if;

  if p_channel = 'qr_table' and p_table_id is null then
    raise exception 'TABLE_REQUIRED: dine-in orders must include a table_id';
  end if;

  insert into public.orders (
    channel, status, table_id, customer_id, scheduled_for,
    delivery_address_line, delivery_lat, delivery_lng, delivery_notes
  )
  values (
    p_channel, 'placed', p_table_id, v_customer_id, p_scheduled_for,
    p_delivery_address, p_delivery_lat, p_delivery_lng, p_delivery_notes
  )
  returning id, orders.order_number into v_order_id, v_order_number;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_menu_item from public.menu_items
      where id = (v_item ->> 'menu_item_id')::uuid and deleted_at is null and is_active = true
      for update;

    if not found then
      raise exception 'ITEM_UNAVAILABLE: %', v_item ->> 'menu_item_id';
    end if;

    v_qty := coalesce((v_item ->> 'quantity')::int, 1);
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY: %', v_menu_item.id;
    end if;

    -- guarded single-statement decrement: the WHERE clause re-checks stock
    -- at write time, so this can't oversell even under concurrent checkouts.
    if v_menu_item.stock_quantity is not null then
      update public.menu_items
        set stock_quantity = stock_quantity - v_qty, stock_version = stock_version + 1
        where id = v_menu_item.id and stock_quantity >= v_qty
        returning stock_quantity into v_updated_stock;

      if not found then
        raise exception 'OUT_OF_STOCK: % (% left)', v_menu_item.name_en, v_menu_item.stock_quantity;
      end if;
    end if;

    v_weight_tier_id := null;
    v_weight_tier_grams := null;

    if v_menu_item.is_weight_based and (v_item ->> 'weight_tier_id') is not null then
      select id, grams, price_multiplier
        into v_weight_tier_id, v_weight_tier_grams, v_weight_tier_multiplier
        from public.weight_tiers
        where id = (v_item ->> 'weight_tier_id')::uuid and menu_item_id = v_menu_item.id;

      if not found then
        raise exception 'INVALID_WEIGHT_TIER: %', v_item ->> 'weight_tier_id';
      end if;

      v_unit_price := round(v_menu_item.base_price * v_weight_tier_multiplier, 2);
    else
      v_unit_price := v_menu_item.base_price;
    end if;

    v_line_total := v_unit_price * v_qty;

    insert into public.order_items (
      order_id, menu_item_id, station, quantity, weight_grams_ordered,
      doneness, unit_price, line_total, notes, status
    )
    values (
      v_order_id, v_menu_item.id, v_menu_item.default_station, v_qty, v_weight_tier_grams,
      nullif(v_item ->> 'doneness', '')::public.doneness_level,
      v_unit_price, v_line_total, nullif(v_item ->> 'notes', ''), 'placed'
    )
    returning id into v_order_item_id;

    v_subtotal := v_subtotal + v_line_total;

    if v_item ? 'modifier_ids' then
      for v_modifier_id in select jsonb_array_elements_text(v_item -> 'modifier_ids')::uuid
      loop
        select * into v_modifier from public.modifiers where id = v_modifier_id and is_active = true;
        if not found then
          raise exception 'INVALID_MODIFIER: %', v_modifier_id;
        end if;

        insert into public.order_item_modifiers (order_item_id, modifier_id, name_snapshot, price_delta_snapshot)
        values (v_order_item_id, v_modifier.id, v_modifier.name_en, v_modifier.price_delta);

        v_subtotal := v_subtotal + v_modifier.price_delta * v_qty;
      end loop;
    end if;

    if v_menu_item.item_type = 'combo' and v_item ? 'combo_selections' then
      for v_combo_sel in select * from jsonb_array_elements(v_item -> 'combo_selections')
      loop
        select cc.id, cc.slot_label, cc.quantity, cc.upcharge
          into v_component
          from public.combo_components cc
          join public.menu_items mi on mi.id = (v_combo_sel ->> 'component_menu_item_id')::uuid
          where cc.id = (v_combo_sel ->> 'combo_component_id')::uuid
            and cc.combo_menu_item_id = v_menu_item.id
            and mi.category_id = cc.category_id
            and mi.deleted_at is null
            and mi.is_active = true;

        if not found then
          raise exception 'INVALID_COMBO_SELECTION: %', v_combo_sel;
        end if;

        insert into public.order_item_components (
          order_item_id, combo_component_id, slot_label, component_menu_item_id, quantity, upcharge_snapshot
        )
        values (
          v_order_item_id, v_component.id, v_component.slot_label,
          (v_combo_sel ->> 'component_menu_item_id')::uuid, v_component.quantity, v_component.upcharge
        );

        v_subtotal := v_subtotal + (v_component.upcharge * v_component.quantity * v_qty);
      end loop;
    end if;
  end loop;

  -- KSA standard VAT. Full ZATCA e-invoice generation (signed XML, stamped
  -- QR) is a POS-side concern landing in Phase 3 — zatca_invoice_uuid/
  -- zatca_qr_payload stay null until then.
  v_tax := round(v_subtotal * 0.15, 2);
  v_grand := v_subtotal + v_tax;

  update public.orders set subtotal = v_subtotal, tax_total = v_tax, grand_total = v_grand
    where id = v_order_id;

  return query select v_order_id, v_order_number;
end;
$$;
