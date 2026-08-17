-- ============================================================================
-- 0005: Developer Portal-managed state — feature flags, brand assets, theme
-- tokens. These back the /admin/developer control center so logos, colors,
-- and flags change without a code deploy.
-- ============================================================================

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  rollout_percentage int not null default 100 check (rollout_percentage between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.brand_assets (
  key text primary key, -- e.g. 'logo_primary', 'hero_bg_customer', 'favicon'
  storage_path text not null, -- Supabase Storage object path, resolved by <AppImage />
  alt_text text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create table public.theme_tokens (
  key text primary key, -- e.g. 'customer', 'pos', 'bi', 'admin' — one row per app surface
  tokens jsonb not null default '{}', -- CSS custom property name -> value
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create function public.audit_developer_portal_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.audit_action;
  v_key text;
begin
  v_key := coalesce(new.key, old.key);
  v_action := case tg_table_name
    when 'feature_flags' then 'feature_flag_toggle'
    else 'asset_update'
  end;
  insert into public.audit_logs (actor_id, actor_role, action, target_table, target_id, before, after)
  values (auth.uid(), public.current_role(), v_action, tg_table_name, v_key, to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

create trigger feature_flags_audit
  after update on public.feature_flags
  for each row execute function public.audit_developer_portal_change();

create trigger brand_assets_audit
  after update on public.brand_assets
  for each row execute function public.audit_developer_portal_change();

create trigger theme_tokens_audit
  after update on public.theme_tokens
  for each row execute function public.audit_developer_portal_change();

alter publication supabase_realtime add table public.feature_flags;
alter publication supabase_realtime add table public.brand_assets;
alter publication supabase_realtime add table public.theme_tokens;
