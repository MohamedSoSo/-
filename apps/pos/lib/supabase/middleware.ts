import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@bbq/supabase";
import { buildCsp, SECURITY_HEADERS } from "@bbq/config/csp";

const PUBLIC_PATHS = ["/login", "/api/health", "/api/dev-login", "/sw.js", "/manifest.json"];

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // CSP (script-src 'strict-dynamic') is production-only: Next.js dev mode's
  // Fast Refresh needs 'unsafe-eval', which a strict policy would block.
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL!));
  }
  for (const [key, value] of SECURITY_HEADERS) response.headers.set(key, value);
  return response;
}

// Every route in this app is staff-only — unlike the customer app, there's
// no public browsing mode. Terminal login (real Supabase Auth) is the RLS
// security boundary; PIN-switch on top of it is attribution-only (see
// supabase/migrations/0016_phase3_rpcs.sql).
export async function updateSession(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return withSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  if (!isPublic && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["cashier", "grill_chef", "kitchen_chef", "waiter", "driver", "owner", "developer"].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_staff");
      return withSecurityHeaders(NextResponse.redirect(url), nonce);
    }
  }

  return withSecurityHeaders(response, nonce);
}
