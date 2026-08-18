"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { locales, type Locale } from "@bbq/i18n";

const LOCALE_LABELS: Record<Locale, string> = { ar: "العربية", en: "English" };

/**
 * Swaps only the leading /ar or /en URL segment (our `localePrefix: "always"`
 * convention — see each app's middleware.ts) and keeps the rest of the path
 * and query string intact, so switching locale mid-flow (e.g. mid-checkout)
 * doesn't bounce the user back to the home page.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: Locale) {
    if (next === currentLocale) return;
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/") || "/");
    router.refresh();
  }

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-1 text-xs ${className ?? ""}`}
      role="group"
      aria-label="Language"
    >
      <Languages size={14} className="text-smoke-400 mx-1.5" aria-hidden="true" />
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          aria-current={loc === currentLocale ? "true" : undefined}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
            loc === currentLocale ? "bg-ember-500 text-charcoal-900" : "text-charcoal-100 hover:bg-white/10"
          }`}
        >
          {LOCALE_LABELS[loc]}
        </button>
      ))}
    </div>
  );
}
