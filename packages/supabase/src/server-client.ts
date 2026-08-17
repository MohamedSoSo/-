import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Minimal cookie-store shape shared by Next.js server components, route
// handlers, and middleware — callers pass whichever `cookies()`-like object
// their context provides.
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options: Record<string, unknown> }[]): void;
}

export function createClient(cookieAdapter: CookieAdapter) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — check .env.local against .env.example"
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieAdapter.getAll(),
      setAll: (cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) =>
        cookieAdapter.setAll(cookiesToSet),
    },
  });
}

// SERVER-ONLY. Bypasses RLS entirely — for trusted backend jobs (webhooks,
// ZATCA submission, scheduled BI rollups) only. Never import this into any
// file that ships to the client bundle.
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY for service-role client");
  }

  return createServerClient<Database>(url, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
