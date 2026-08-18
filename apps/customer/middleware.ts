import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "@bbq/i18n";
import { updateSession } from "./lib/supabase/middleware";

// /api/** isn't a page route and never gets a [locale] segment — skip locale
// routing entirely for it and run the existing auth/session logic unchanged.
const UNLOCALIZED_PREFIXES = ["/api"];

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

  // A missing/invalid locale prefix gets redirected (e.g. "/checkout" ->
  // "/ar/checkout") before any auth check runs — once redirected, this
  // middleware runs again with the locale now present.
  const intlResponse = handleI18nRouting(request);
  if (intlResponse.status === 307 || intlResponse.status === 308) {
    return intlResponse;
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
