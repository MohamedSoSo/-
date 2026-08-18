import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@bbq/i18n";
import { updateSession } from "./lib/supabase/middleware";

// None of these are page routes under [locale] — skip locale routing for
// them entirely and run the existing auth/session logic unchanged.
const UNLOCALIZED_PREFIXES = ["/api", "/sw.js", "/manifest.json"];

const handleI18nRouting = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (UNLOCALIZED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return updateSession(request);
  }

  const intlResponse = handleI18nRouting(request);
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
