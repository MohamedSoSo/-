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
}

/**
 * PhoneAuthForm.tsx calls this instead of supabase.auth.signInWithOtp()
 * directly, so Owner BI sign-in gets the same server-side OTP rate
 * limiting as the customer app. See
 * supabase/migrations/0029_otp_rate_limiting.sql.
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
  const result = await requestOtpWithRateLimit(supabase, body.phone, getClientIp(request));

  if (!result.ok) {
    const status = result.error?.includes("RATE_LIMITED") ? 429 : 400;
    return NextResponse.json({ error: result.error ?? "OTP_REQUEST_FAILED" }, { status });
  }

  return NextResponse.json({ success: true });
}
