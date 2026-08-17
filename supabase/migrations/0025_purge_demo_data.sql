-- ============================================================================
-- 0025: purge_demo_data() — developer-only, explicit-confirmation hard
-- delete of orders (and dependents) within a date range. This is a
-- deliberate, narrow exception to "no hard deletes on orders" (0003's
-- design) for clearing synthetic seed/demo data before handover — it has no
-- way to distinguish "demo" from "real" beyond the date range the developer
-- explicitly supplies, so the caller is trusted to pick correctly. Not
-- exposed to any role but developer, and requires typing an exact
-- confirmation phrase (mirrors typical "type DELETE to confirm" UX).
-- ============================================================================

create function public.purge_demo_data(p_start_date date, p_end_date date, p_confirm text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.is_developer() then
    raise exception 'FORBIDDEN: developer only';
  end if;

  if p_confirm is distinct from 'DELETE DEMO DATA' then
    raise exception 'CONFIRMATION_REQUIRED: type the exact phrase to proceed';
  end if;

  if p_end_date < p_start_date then
    raise exception 'INVALID_RANGE: end date must be on or after start date';
  end if;

  select count(*) into v_count from public.orders where placed_at::date between p_start_date and p_end_date;

  -- dependency order: payments has no ON DELETE CASCADE from orders (0014),
  -- so it must go first; order_items cascades its own dependents
  -- (modifiers/components/status_events) automatically.
  delete from public.payments
    where order_id in (select id from public.orders where placed_at::date between p_start_date and p_end_date);
  delete from public.order_items
    where order_id in (select id from public.orders where placed_at::date between p_start_date and p_end_date);
  delete from public.orders
    where placed_at::date between p_start_date and p_end_date;

  delete from public.inventory_waste where created_at::date between p_start_date and p_end_date;
  delete from public.shifts where opened_at::date between p_start_date and p_end_date;

  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, reason)
  values (
    auth.uid(), public.current_role(), 'elevated_auth', 'orders', 'bulk_purge',
    format('Purged %s orders placed between %s and %s (demo-data cleanup)', v_count, p_start_date, p_end_date)
  );

  return v_count;
end;
$$;

grant execute on function public.purge_demo_data(date, date, text) to authenticated;
