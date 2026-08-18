"use client";

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from "recharts";
import { useLocale, useTranslations } from "next-intl";
import type { BcgMenuItem, BcgQuadrant } from "@/lib/analytics/bcg";
import { localizedField, type Locale } from "@bbq/i18n";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";

const QUADRANT_COLOR: Record<BcgQuadrant, string> = {
  star: CATEGORICAL[2], // aqua — good
  plowhorse: CATEGORICAL[0], // blue
  puzzle: CATEGORICAL[6], // violet
  dog: CATEGORICAL[7], // red
};

const QUADRANTS: BcgQuadrant[] = ["star", "plowhorse", "puzzle", "dog"];

export function BcgScatter({ items }: { items: BcgMenuItem[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("bcgScatter");

  if (items.length === 0) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-medium text-charcoal-100 mb-1">{t("title")}</h3>
        <p className="text-sm text-smoke-400">{t("noSales")}</p>
      </div>
    );
  }

  const medianUnits = median(items.map((i) => i.unitsSold));
  const medianMargin = median(items.map((i) => i.marginPct));

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-charcoal-100">{t("title")}</h3>
        <div className="flex gap-3 text-[11px]">
          {QUADRANTS.map((q) => (
            <span key={q} className="flex items-center gap-1 text-smoke-400">
              <span className="h-2 w-2 rounded-full" style={{ background: QUADRANT_COLOR[q] }} />
              {t(`quadrants.${q}`)}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={CHART_CHROME.gridline} />
          <XAxis
            type="number"
            dataKey="unitsSold"
            name={t("unitsSold")}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={{ stroke: CHART_CHROME.baseline }}
            tickLine={false}
            label={{ value: t("unitsSoldAxis"), position: "insideBottom", offset: -4, fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="marginPct"
            name={t("margin")}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={{ stroke: CHART_CHROME.baseline }}
            tickLine={false}
            label={{ value: t("marginAxis"), angle: -90, position: "insideLeft", fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          />
          <ReferenceLine x={medianUnits} stroke={CHART_CHROME.baseline} strokeDasharray="3 3" />
          <ReferenceLine y={medianMargin} stroke={CHART_CHROME.baseline} strokeDasharray="3 3" />
          <Tooltip
            cursor={{ stroke: CHART_CHROME.baseline }}
            contentStyle={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_CHROME.primaryInk }}
            formatter={(value: number, name: string) => [name === t("margin") ? `${(value * 100).toFixed(0)}%` : value, name]}
            labelFormatter={() => ""}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as BcgMenuItem | undefined;
              if (!p) return null;
              return (
                <div style={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8, padding: 8 }}>
                  <p style={{ color: CHART_CHROME.primaryInk, fontSize: 12, fontWeight: 600 }}>
                    {localizedField(p.nameEn, p.nameAr, locale)}
                  </p>
                  <p style={{ color: CHART_CHROME.secondaryInk, fontSize: 11 }}>
                    {p.unitsSold} · {(p.marginPct * 100).toFixed(0)}% · {t(`quadrants.${p.quadrant}`)}
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={items}>
            {items.map((item, i) => (
              <Cell key={i} fill={QUADRANT_COLOR[item.quadrant]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}
