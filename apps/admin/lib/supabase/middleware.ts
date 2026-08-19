import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@bbq/supabase";
import { buildCsp, SECURITY_HEADERS } from "@bbq/config/csp";
import { stripLocalePrefix } from "@bbq/i18n";

const DEVELOPER_ONLY_PREFIX = "/admin/developer";
// Catalog management is an owner/management concern, not a developer-only
// one — gated to is_management()'s role set (owner, developer), the same
// tier as the RLS policies backing menu_items/categories writes (0006,
// 0032), not the stricter developer-only tier above.
const MANAGEMENT_PREFIX = "/admin/catalog";
const MANAGEMENT_ROLES = new Set(["owner", "developer"]);

function withSecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  // CSP (script-src 'strict-dynamic') is production-only: Next.js dev mode's
  // Fast Refresh needs 'unsafe-eval', which a strict policy would block.
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Content-Security-Policy", buildCsp(nonce, process.env.NEXT_PUBLIC_SUPABASE_URL!));
  }
  for (const [key, value] of SECURITY_HEADERS) response.headers.set(key, value);
  return response;
}

// Runs on every request: refreshes the Supabase session cookie (required by
// @supabase/ssr's PKCE flow) and gates the Developer Portal to role='developer'
// at the edge — the RLS policies in 0006_rls_policies.sql back this up at the
// database layer, so this is defense-in-depth, not the only guard.
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

  const { locale, path } = stripLocalePrefix(request.nextUrl.pathname);

  if (path.startsWith(DEVELOPER_ONLY_PREFIX) || path.startsWith(MANAGEMENT_PREFIX)) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/login`;
      url.searchParams.set("next", request.nextUrl.pathname);
      return withSecurityHeaders(NextResponse.redirect(url), nonce);
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

    const allowed = path.startsWith(DEVELOPER_ONLY_PREFIX)
      ? profile?.role === "developer"
      : MANAGEMENT_ROLES.has(profile?.role ?? "");

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}/unauthorized`;
      return withSecurityHeaders(NextResponse.redirect(url), nonce);
    }
  }

  return withSecurityHeaders(response, nonce);
}
