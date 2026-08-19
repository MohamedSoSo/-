import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export interface RequestOtpResult {
  ok: boolean;
  error?: string;
}

/**
 * Shared by customer/pos/bi's app/api/auth/request-otp/route.ts — each app
 * calls this from its own server-side Route Handler (never from the
 * browser) so the actual signInWithOtp call is always preceded by the
 * Postgres-native rate limiter in supabase/migrations/0029_otp_rate_limiting.sql.
 * This is additive to Supabase Auth's own OTP protections, not a
 * replacement for them.
 */
export async function requestOtpWithRateLimit(
  supabase: SupabaseClient<Database>,
  phone: string,
  clientIp: string | null,
  channel?: "sms" | "whatsapp"
): Promise<RequestOtpResult> {
  const { error: rateLimitError } = await supabase.rpc("check_and_record_otp_rate_limit", {
    p_phone: phone,
    p_client_ip: clientIp,
  });
  if (rateLimitError) return { ok: false, error: rateLimitError.message };

  const { error: otpError } = await supabase.auth.signInWithOtp({
    phone,
    options: channel ? { channel } : undefined,
  });
  if (otpError) return { ok: false, error: otpError.message };

  return { ok: true };
}
