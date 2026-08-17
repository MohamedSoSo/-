-- ============================================================================
-- 0016: Phase 3 RPCs — staff PIN identity, shifts, petty cash, payments,
-- table transfer/merge, supervisor-approved void/discount (with automatic
-- waste conversion), manual waste logging, drawer events.
--
-- PIN model: verify_staff_pin() is an IDENTITY/ATTRIBUTION check, not the
-- RLS security boundary. It's only callable by an already-authenticated
-- Supabase session (`to authenticated`, never `anon`) — the terminal must
-- already be logged in via real auth before any PIN means anything. This
-- matches how Square/Toast-style POS terminals work: one real login per
-- device/shift, fast PIN switch on top for "who rang this up".
-- ============================================================================

create function public.set_staff_pin(p_pin text, p_target_profile_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target uuid := coalesce(p_target_profile_id, auth.uid());
begin
  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'INVALID_PIN: must be 4-6 digits';
  end if;

  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  if v_target <> auth.uid() and not public.is_management() then
    raise exception 'FORBIDDEN: only owner/developer can set another staff member''s PIN';
  end if;

  update public.profiles
    set pin_hash = crypt(p_pin, gen_salt('bf')), pin_set_at = now()
    where id = v_target;

  if not found then
    raise exception 'PROFILE_NOT_FOUND: %', v_target;
  end if;
end;
$$;

grant execute on function public.set_staff_pin(text, uuid) to authenticated;

create function public.verify_staff_pin(p_pin text)
returns table (profile_id uuid, display_name text, role public.app_role)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select p.id, p.display_name, p.role
    from public.profiles p
    where p.pin_hash is not null
      and p.is_active
      and p.deleted_at is null
      and crypt(p_pin, p.pin_hash) = p.pin_hash
    limit 1;
end;
$$;

grant execute on function public.verify_staff_pin(text) to authenticated;

-- ── shifts ───────────────────────────────────────────────────────────────
create function public.open_shift(p_opening_balance numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift_id uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  if exists (select 1 from public.shifts where cashier_id = auth.uid() and status = 'open') then
    raise exception 'SHIFT_ALREADY_OPEN: close your current shift before opening a new one';
  end if;

  insert into public.shifts (cashier_id, opening_balance)
  values (auth.uid(), p_opening_balance)
  returning id into v_shift_id;

  return v_shift_id;
end;
$$;

grant execute on function public.open_shift(numeric) to authenticated;

create function public.close_shift(p_shift_id uuid, p_counted_cash numeric, p_notes text default null)
returns table (expected_cash numeric, variance numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift record;
  v_cash_in numeric;
  v_cash_refunds numeric;
  v_petty_out numeric;
  v_expected numeric;
  v_variance numeric;
begin
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found then
    raise exception 'SHIFT_NOT_FOUND: %', p_shift_id;
  end if;

  if v_shift.cashier_id <> auth.uid() and not public.is_management() then
    raise exception 'FORBIDDEN: only the shift owner or management can close this shift';
  end if;

  if v_shift.status = 'closed' then
    raise exception 'SHIFT_ALREADY_CLOSED: %', p_shift_id;
  end if;

  select coalesce(sum(amount) filter (where not is_refund), 0),
         coalesce(sum(amount) filter (where is_refund), 0)
    into v_cash_in, v_cash_refunds
    from public.payments
    where shift_id = p_shift_id and method = 'cash';

  select coalesce(sum(amount), 0) into v_petty_out
    from public.petty_cash_entries where shift_id = p_shift_id;

  v_expected := v_shift.opening_balance + v_cash_in - v_cash_refunds - v_petty_out;
  v_variance := p_counted_cash - v_expected;

  update public.shifts
    set status = 'closed', closed_at = now(), closing_balance_expected = v_expected,
        closing_balance_counted = p_counted_cash, cash_variance = v_variance, notes = p_notes
    where id = p_shift_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after, reason)
  values (
    auth.uid(), public.current_role(), 'shift_close', 'shifts', p_shift_id::text,
    jsonb_build_object('status', 'open'),
    jsonb_build_object('expected', v_expected, 'counted', p_counted_cash, 'variance', v_variance),
    p_notes
  );

  return query select v_expected, v_variance;
end;
$$;

grant execute on function public.close_shift(uuid, numeric, text) to authenticated;

create function public.record_petty_cash(p_shift_id uuid, p_amount numeric, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  if not exists (select 1 from public.shifts where id = p_shift_id and status = 'open') then
    raise exception 'SHIFT_NOT_OPEN: %', p_shift_id;
  end if;

  insert into public.petty_cash_entries (shift_id, amount, reason, recorded_by)
  values (p_shift_id, p_amount, p_reason, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_petty_cash(uuid, numeric, text) to authenticated;

-- ── payments (split-bill = N of these per order) ────────────────────────
create function public.record_payment(
  p_order_id uuid, p_method public.payment_method, p_amount numeric,
  p_shift_id uuid default null, p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT: must be positive';
  end if;

  if not exists (select 1 from public.orders where id = p_order_id) then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  insert into public.payments (order_id, method, amount, tendered_by, shift_id, reference)
  values (p_order_id, p_method, p_amount, auth.uid(), p_shift_id, p_reference)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.record_payment(uuid, public.payment_method, numeric, uuid, text) to authenticated;

-- ── table transfer / merge ──────────────────────────────────────────────
create function public.transfer_table(p_order_id uuid, p_new_table_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_table_id uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  select table_id into v_old_table_id from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  update public.orders set table_id = p_new_table_id where id = p_order_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
  values (
    auth.uid(), public.current_role(), 'table_transfer', 'orders', p_order_id::text,
    jsonb_build_object('table_id', v_old_table_id), jsonb_build_object('table_id', p_new_table_id)
  );
end;
$$;

grant execute on function public.transfer_table(uuid, uuid) to authenticated;

create function public.merge_tables(p_source_table_id uuid, p_target_table_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count int := 0;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  for v_order in
    select id from public.orders
    where table_id = p_source_table_id
      and status not in ('completed', 'cancelled', 'voided', 'served', 'delivered')
      and deleted_at is null
  loop
    update public.orders set table_id = p_target_table_id where id = v_order.id;

    insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
    values (
      auth.uid(), public.current_role(), 'order_merge', 'orders', v_order.id::text,
      jsonb_build_object('table_id', p_source_table_id), jsonb_build_object('table_id', p_target_table_id)
    );

    v_count := v_count + 1;
  end loop;

  update public.restaurant_tables set status = 'needs_cleaning' where id = p_source_table_id;

  return v_count;
end;
$$;

grant execute on function public.merge_tables(uuid, uuid) to authenticated;

-- ── supervisor-approved void (auto waste conversion) + discount ───────────
create function public.void_order_item(p_order_item_id uuid, p_reason text, p_supervisor_pin text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_supervisor record;
  v_modifiers_total numeric(10, 2);
  v_components_total numeric(10, 2);
  v_line_total numeric(10, 2);
  v_new_subtotal numeric(10, 2);
  v_new_tax numeric(10, 2);
begin
  select p.id, p.role into v_supervisor
    from public.profiles p
    where p.pin_hash is not null and p.is_active and p.deleted_at is null
      and crypt(p_supervisor_pin, p.pin_hash) = p.pin_hash
    limit 1;

  if not found or v_supervisor.role not in ('owner', 'developer') then
    raise exception 'SUPERVISOR_PIN_INVALID';
  end if;

  select * into v_item from public.order_items where id = p_order_item_id for update;
  if not found then
    raise exception 'ORDER_ITEM_NOT_FOUND: %', p_order_item_id;
  end if;

  if v_item.status = 'voided' then
    raise exception 'ALREADY_VOIDED: %', p_order_item_id;
  end if;

  -- cooking had already started on the grill: this is real meat that was
  -- pulled, not an order that simply never got made — log it as waste
  -- instead of letting it vanish from the numbers.
  if v_item.station = 'grill' and v_item.status in ('grilling', 'kitchen_prep', 'plating', 'ready', 'served') then
    insert into public.inventory_waste (menu_item_id, order_item_id, weight_grams, quantity, reason, notes, staff_id)
    values (
      v_item.menu_item_id, v_item.id,
      coalesce(v_item.weight_grams_actual, v_item.weight_grams_ordered),
      v_item.quantity, 'voided_after_cook', p_reason, auth.uid()
    );
  end if;

  select coalesce(sum(price_delta_snapshot * v_item.quantity), 0) into v_modifiers_total
    from public.order_item_modifiers where order_item_id = v_item.id;

  select coalesce(sum(upcharge_snapshot * quantity * v_item.quantity), 0) into v_components_total
    from public.order_item_components where order_item_id = v_item.id;

  v_line_total := v_item.line_total + v_modifiers_total + v_components_total;

  update public.order_items set status = 'voided' where id = p_order_item_id;

  select greatest(subtotal - v_line_total, 0) into v_new_subtotal from public.orders where id = v_item.order_id;
  v_new_tax := round(v_new_subtotal * 0.15, 2);

  -- raises ZATCA_LOCKED (0014's trigger) if this order was already
  -- invoiced — correct: a signed invoice needs a credit note, not an edit.
  update public.orders
    set subtotal = v_new_subtotal, tax_total = v_new_tax,
        grand_total = greatest(v_new_subtotal + v_new_tax - discount_total, 0)
    where id = v_item.order_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after, reason)
  values (
    auth.uid(), public.current_role(), 'void_transaction', 'order_items', p_order_item_id::text,
    jsonb_build_object('status', v_item.status),
    jsonb_build_object('status', 'voided', 'approved_by', v_supervisor.id),
    p_reason
  );
end;
$$;

grant execute on function public.void_order_item(uuid, text, text) to authenticated;

create function public.apply_discount(
  p_order_id uuid, p_discount_amount numeric, p_reason text, p_supervisor_pin text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supervisor record;
  v_order record;
begin
  if p_discount_amount <= 0 then
    raise exception 'INVALID_DISCOUNT: must be positive';
  end if;

  select p.id, p.role into v_supervisor
    from public.profiles p
    where p.pin_hash is not null and p.is_active and p.deleted_at is null
      and crypt(p_supervisor_pin, p.pin_hash) = p.pin_hash
    limit 1;

  if not found or v_supervisor.role not in ('owner', 'developer') then
    raise exception 'SUPERVISOR_PIN_INVALID';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND: %', p_order_id;
  end if;

  if p_discount_amount > (v_order.subtotal + v_order.tax_total - v_order.discount_total) then
    raise exception 'DISCOUNT_EXCEEDS_TOTAL';
  end if;

  update public.orders
    set discount_total = discount_total + p_discount_amount,
        grand_total = greatest(subtotal + tax_total - (discount_total + p_discount_amount), 0)
    where id = p_order_id;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after, reason)
  values (
    auth.uid(), public.current_role(), 'discount_applied', 'orders', p_order_id::text,
    jsonb_build_object('discount_total', v_order.discount_total),
    jsonb_build_object('discount_total', v_order.discount_total + p_discount_amount, 'approved_by', v_supervisor.id),
    p_reason
  );
end;
$$;

grant execute on function public.apply_discount(uuid, numeric, text, text) to authenticated;

-- ── manual waste + drawer events ────────────────────────────────────────
create function public.log_manual_waste(
  p_menu_item_id uuid, p_weight_grams int, p_quantity int, p_reason public.waste_reason, p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  insert into public.inventory_waste (menu_item_id, weight_grams, quantity, reason, notes, staff_id)
  values (p_menu_item_id, p_weight_grams, coalesce(p_quantity, 1), p_reason, p_notes, auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.log_manual_waste(uuid, int, int, public.waste_reason, text) to authenticated;

create function public.log_drawer_event(p_shift_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN: staff only';
  end if;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, reason)
  values (auth.uid(), public.current_role(), 'no_sale_drawer_open', 'shifts', coalesce(p_shift_id::text, 'unknown'), p_reason);
end;
$$;

grant execute on function public.log_drawer_event(uuid, text) to authenticated;
