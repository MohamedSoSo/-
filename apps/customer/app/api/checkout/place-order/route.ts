import { NextResponse, type NextRequest } from "next/server";
import { CheckoutPayloadSchema } from "@bbq/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The one deliberate exception to this codebase's "browser calls Supabase
 * directly" rule (see supabase/migrations/0027's comment, and 0028's for
 * why place_order() specifically needs this). Guest checkout has no
 * reliable auth.uid() to rate-limit on, so this route determines the
 * caller's real IP server-side (not trustable if read from a client-
 * supplied value) and passes it into place_order() as p_client_ip — a
 * Postgres function has no way to see that on its own. Everything else
 * (auth cookies, RLS, validation) flows through exactly as a direct RPC
 * call would; this is a thin proxy, not a new trust boundary of its own.
 */
function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const parsed = CheckoutPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: parsed.error.issues[0]?.message ?? "Invalid checkout payload" },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_channel: parsed.data.channel,
    p_table_id: parsed.data.table_id ?? null,
    p_scheduled_for: parsed.data.scheduled_for ?? null,
    p_delivery_address: parsed.data.delivery_address ?? null,
    p_delivery_lat: parsed.data.delivery_lat ?? null,
    p_delivery_lng: parsed.data.delivery_lng ?? null,
    p_delivery_notes: parsed.data.delivery_notes ?? null,
    p_items: parsed.data.items,
    p_client_ip: getClientIp(request),
  });

  if (error || !data?.[0]) {
    return NextResponse.json({ error: error?.message ?? "PLACE_ORDER_FAILED" }, { status: 400 });
  }

  return NextResponse.json({ order_id: data[0].order_id, order_number: data[0].order_number });
}
