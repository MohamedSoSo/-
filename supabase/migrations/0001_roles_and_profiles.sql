-- ============================================================================
-- 0001: Extensions, role enum, profiles (1:1 with auth.users)
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type public.app_role as enum (
  'customer',
  'cashier',
  'grill_chef',
  'kitchen_chef',
  'waiter',
  'driver',
  'owner',
  'developer'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'customer',
  display_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz -- soft delete: staff accounts are never hard-deleted
);

comment on table public.profiles is 'One row per auth.users entry. role drives all RLS + RBAC across the platform.';

-- auto-create a profile row whenever a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- phone-only auth: no email present, fall back to phone/meta-supplied name
  insert into public.profiles (id, display_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.phone, new.email, 'Guest'),
    new.phone,
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'customer')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- SECURITY DEFINER helper so RLS policies can check role without recursive
-- lookups against profiles (which itself has RLS enabled).
create function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in (
    'cashier', 'grill_chef', 'kitchen_chef', 'waiter', 'driver', 'owner', 'developer'
  );
$$;

create function public.is_management()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('owner', 'developer');
$$;
