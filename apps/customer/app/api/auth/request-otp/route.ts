import { NextResponse, type NextRequest } from "next/server";
import { requestOtpWithRateLimit } from "@bbq/supabase";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

interface RequestOtpBody {
  phone?: string;
  channel?: "sms" | "whatsapp";
}

/**
 * PhoneAuthForm.tsx calls this instead of supabase.auth.signInWithOtp()
 * directly — the client-side 60s cooldown timer stays as a UX nicety, but
 * it's trivially bypassed by refreshing the page, so real protection has
 * to live server-side. See supabase/migrations/0029_otp_rate_limiting.sql.
 */
export async function POST(request: NextRequest) {
  let body: RequestOtpBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  if (!body.phone || typeof body.phone !== "string") {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const supabase = createClient();
  const result = await requestOtpWithRateLimit(supabase, body.phone, getClientIp(request), body.channel);

  if (!result.ok) {
    const status = result.error?.includes("RATE_LIMITED") ? 429 : 400;
    return NextResponse.json({ error: result.error ?? "OTP_REQUEST_FAILED" }, { status });
  }

  return NextResponse.json({ success: true });
}
