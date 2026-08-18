"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { DateRangePreset } from "@/lib/date-range";

const PRESET_VALUES: DateRangePreset[] = ["today", "7d", "30d"];

export function DateRangeFilter({ current }: { current: DateRangePreset }) {
  const t = useTranslations("dateRange");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPreset(preset: DateRangePreset) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", preset);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex rounded-full border border-white/10 p-1">
      {PRESET_VALUES.map((value) => (
        <button
          key={value}
          onClick={() => setPreset(value)}
          className={`rounded-full px-3 py-1.5 text-sm ${
            current === value ? "bg-ember-500 text-charcoal-900 font-medium" : "text-charcoal-100"
          }`}
        >
          {t(value)}
        </button>
      ))}
    </div>
  );
}
