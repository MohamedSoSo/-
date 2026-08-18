export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Picks the display string for the active locale from an en/ar pair. */
export function localizedField(en: string, ar: string, locale: Locale): string {
  return locale === "ar" ? ar : en;
}

export function localizedFieldNullable(en: string | null, ar: string | null, locale: Locale): string | null {
  return locale === "ar" ? ar : en;
}

/**
 * Splits a pathname that may carry a leading /ar or /en segment (our
 * next-intl `localePrefix: "always"` convention — see each app's
 * middleware.ts) into the resolved locale and the remaining path, so
 * existing route-prefix checks (auth guards, public-path allowlists) can
 * keep comparing against unprefixed paths like "/account" or "/login".
 */
export function stripLocalePrefix(pathname: string): { locale: Locale; path: string } {
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) {
    const rest = pathname.slice(segment.length + 1);
    return { locale: segment, path: rest || "/" };
  }
  return { locale: defaultLocale, path: pathname };
}
