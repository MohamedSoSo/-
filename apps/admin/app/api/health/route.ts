import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CheckResult {
  ok: boolean;
  detail?: string;
  latencyMs?: number;
}

async function checkDb(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient();
    const { error } = await supabase.from("feature_flags").select("key").limit(1);
    if (error) return { ok: false, detail: error.message, latencyMs: Date.now() - start };
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

async function checkStorage(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createClient();
    const { error } = await supabase.storage.from("brand-assets").list("", { limit: 1 });
    if (error) return { ok: false, detail: error.message, latencyMs: Date.now() - start };
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Realtime has no documented plain-HTTP health path — this checks that the
 * WebSocket upgrade endpoint is reachable at all (any HTTP response, even a
 * 4xx from a non-WS GET, proves DNS + the service are up), not a full
 * WebSocket handshake. Good enough for "is this dependency alive", not a
 * substitute for an actual subscribe-and-receive smoke test.
 */
async function checkRealtimeReachable(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { ok: false, detail: "NEXT_PUBLIC_SUPABASE_URL not set" };
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/realtime/v1/`, { signal: controller.signal });
    clearTimeout(timeout);
    return { ok: res.status < 500, detail: `HTTP ${res.status}`, latencyMs: Date.now() - start };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const [db, storage, realtime] = await Promise.all([checkDb(), checkStorage(), checkRealtimeReachable()]);
  const allOk = db.ok && storage.ok && realtime.ok;

  return NextResponse.json(
    { status: allOk ? "healthy" : "degraded", checks: { database: db, storage, realtime }, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
