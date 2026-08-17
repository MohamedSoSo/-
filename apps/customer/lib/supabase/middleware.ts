import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@bbq/supabase";
import { buildCsp, SECURITY_HEADERS } from "@bbq/config/csp";

const AUTH_REQUIRED_PREFIXES = ["/account"];

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // CSP (script-src 'strict-dynamic') is production-only: Next.js dev mode's
  // Fast Refresh needs 'unsafe-eval', which a strict policy would block.
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL!));
  }
  for (const [key, value] of SECURITY_HEADERS) response.headers.set(key, value);
  return response;
}

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

  const needsAuth = AUTH_REQUIRED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return withSecurityHeaders(NextResponse.redirect(url), nonce);
  }

  return withSecurityHeaders(response, nonce);
}
