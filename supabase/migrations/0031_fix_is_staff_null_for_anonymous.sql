-- ============================================================================
-- 0031: Bug fix, not a Phase 2 rate-limiting change. Discovered during live
-- verification of 0028/0030: is_staff()/is_management() (0001_roles_and_
-- profiles.sql) return NULL, not false, for anonymous callers.
--
-- Root cause: current_role() does `select role from public.profiles where
-- id = auth.uid()`. For a guest, auth.uid() is NULL, the query matches no
-- row, and current_role() returns NULL. `NULL IN (...)` is NULL in SQL (not
-- false), so is_staff()/is_management() propagate that NULL instead of a
-- clean boolean.
--
-- This is harmless everywhere these two functions gate an RLS USING/WITH
-- CHECK clause: Postgres treats a NULL policy expression as "deny", exactly
-- like false, for both row-filtering and write checks — no RLS policy
-- anywhere in this schema changes behavior from this fix. This migration
-- does NOT touch or weaken any RLS policy.
--
-- It is NOT harmless in explicit plpgsql control flow, which is exactly
-- what 0028 added: `if not public.is_staff() then perform
-- check_and_record_place_order_rate_limit(...) end if;`. For a guest,
-- is_staff() = NULL, so `not is_staff()` = NULL, and plpgsql treats a NULL
-- IF-condition as false — the THEN branch (the rate-limit check) was
-- silently skipped for every anonymous checkout. Confirmed live: after
-- deploying 0028+0030, five rapid guest checkouts from the same IP all
-- succeeded with zero rows written to place_order_attempts.
--
-- Every previous caller of is_staff()/is_management() (0027's PIN guard,
-- every RLS policy using them) only ever runs for authenticated staff
-- sessions, where auth.uid() is never null — so this NULL-propagation gap
-- existed since 0001 but had no caller that could ever observe it until
-- place_order() became the first is_staff() caller reachable by anon.
--
-- Fix: coalesce to false. Identical signatures, create or replace, no drop
-- needed.
-- ============================================================================

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in (
    'cashier', 'grill_chef', 'kitchen_chef', 'waiter', 'driver', 'owner', 'developer'
  ), false);
$$;

create or replace function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('owner', 'developer'), false);
$$;
