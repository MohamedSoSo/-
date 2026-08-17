"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { DateRangePreset } from "@/lib/date-range";

const PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export function DateRangeFilter({ current }: { current: DateRangePreset }) {
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
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => setPreset(p.value)}
          className={`rounded-full px-3 py-1.5 text-sm ${
            current === p.value ? "bg-ember-500 text-charcoal-900 font-medium" : "text-charcoal-100"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
