-- ============================================================================
-- 0029: Server-side OTP request rate limiting, shared by all three apps that
-- do phone sign-in (customer, pos, bi). Each app's PhoneAuthForm.tsx used to
-- call supabase.auth.signInWithOtp() directly from the browser, with only a
-- client-side 60s cooldown timer — trivially bypassed by refreshing the
-- page, and no server ever saw or tracked the attempt. Each app now has a
-- Next.js Route Handler (app/api/auth/request-otp/route.ts) that calls
-- check_and_record_otp_rate_limit() below before forwarding to Supabase's
-- own signInWithOtp — this is additive, it doesn't replace or weaken
-- Supabase Auth's own OTP protections.
--
-- Keyed by BOTH phone and client IP, same reasoning as 0028: phone alone
-- would let an attacker on a shared/rotating IP still OTP-bomb one victim's
-- number, and IP alone would let an attacker cycle through many numbers
-- from one connection without ever tripping a per-number limit. Both keys
-- are recorded on every attempt; either one tripping is enough to reject.
--
-- Thresholds: OTP requests are naturally rarer than checkout attempts, but
-- a real user legitimately retries occasionally (SMS delayed, picked the
-- wrong channel, fat-fingered a digit and needs a fresh code) — so this
-- can't be as tight as the PIN guard (0027) either.
--   - per phone: 5 requests / 15 minutes — enough for a few honest retries,
--     not enough to usefully spam-bomb one person's phone with texts.
--   - per IP: 15 requests / 15 minutes — generous enough for a restaurant's
--     shared guest wifi (several different staff/customers signing in from
--     the same egress IP), still caps a script cycling through numbers.
-- ============================================================================

create table public.otp_request_attempts (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  client_ip text not null,
  created_at timestamptz not null default now()
);

create index otp_request_attempts_phone_idx on public.otp_request_attempts (phone, created_at);
create index otp_request_attempts_ip_idx on public.otp_request_attempts (client_ip, created_at);

-- no RLS policies granting client access at all: only the SECURITY DEFINER
-- function below ever touches this table.
alter table public.otp_request_attempts enable row level security;

create function public.check_and_record_otp_rate_limit(p_phone text, p_client_ip text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_key text := coalesce(nullif(trim(p_phone), ''), 'unknown');
  v_ip_key text := coalesce(nullif(trim(p_client_ip), ''), 'unknown');
  v_phone_count int;
  v_ip_count int;
begin
  select count(*) into v_phone_count
    from public.otp_request_attempts
    where phone = v_phone_key and created_at > now() - interval '15 minutes';

  if v_phone_count >= 5 then
    raise exception 'RATE_LIMITED: too many verification codes requested for this number — wait a few minutes and try again';
  end if;

  select count(*) into v_ip_count
    from public.otp_request_attempts
    where client_ip = v_ip_key and created_at > now() - interval '15 minutes';

  if v_ip_count >= 15 then
    raise exception 'RATE_LIMITED: too many verification codes requested from this connection — wait a few minutes and try again';
  end if;

  insert into public.otp_request_attempts (phone, client_ip) values (v_phone_key, v_ip_key);
end;
$$;

grant execute on function public.check_and_record_otp_rate_limit(text, text) to anon, authenticated;
