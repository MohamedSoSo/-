"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HeatmapCell } from "@/lib/analytics/operations";
import { SEQUENTIAL_BLUE } from "@/lib/chart-colors";

const DOW_ORDER = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function colorFor(value: number, max: number): string {
  if (max === 0 || value === 0) return "transparent";
  const ratio = value / max;
  const idx = Math.min(SEQUENTIAL_BLUE.length - 1, Math.floor(ratio * (SEQUENTIAL_BLUE.length - 1)));
  return SEQUENTIAL_BLUE[idx]!;
}

export function HourlyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const t = useTranslations("hourlyHeatmap");
  const [hover, setHover] = useState<HeatmapCell | null>(null);
  const max = Math.max(...cells.map((c) => c.orderCount), 1);
  const byKey = new Map(cells.map((c) => [`${c.dow}::${c.hour}`, c]));

  return (
    <div className="glass-panel p-4 overflow-x-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-charcoal-100">{t("title")}</h3>
        {hover && (
          <p className="text-xs text-smoke-400">
            {t(`dow.${hover.dow}`)} {hover.hour}:00 — {t("ordersCount", { count: hover.orderCount })}
          </p>
        )}
      </div>
      <div className="min-w-[560px]">
        <div className="grid grid-cols-[32px_repeat(24,1fr)] gap-[2px] mb-1">
          <div />
          {HOURS.map((h) => (
            <div key={h} className="text-[9px] text-smoke-500 text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {DOW_ORDER.map((dow) => (
          <div key={dow} className="grid grid-cols-[32px_repeat(24,1fr)] gap-[2px] mb-[2px]">
            <div className="text-[10px] text-smoke-500 flex items-center">{t(`dow.${dow}`)}</div>
            {HOURS.map((hour) => {
              const cell = byKey.get(`${dow}::${hour}`) ?? { dow, hour, orderCount: 0 };
              return (
                <div
                  key={hour}
                  onMouseEnter={() => setHover(cell)}
                  onMouseLeave={() => setHover(null)}
                  className="aspect-square rounded-sm border border-white/5"
                  style={{ background: colorFor(cell.orderCount, max) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
