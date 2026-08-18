"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useTranslations } from "next-intl";
import type { DailyRevenuePoint } from "@/lib/analytics/financial";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";

export function RevenueTrendChart({ data }: { data: DailyRevenuePoint[] }) {
  const t = useTranslations("revenueTrendChart");
  const tCommon = useTranslations("common");

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">{t("title")}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CATEGORICAL[0]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CATEGORICAL[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} />
          <XAxis
            dataKey="label"
            stroke={CHART_CHROME.mutedInk}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={{ stroke: CHART_CHROME.baseline }}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke={CHART_CHROME.mutedInk}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_CHROME.primaryInk }}
            itemStyle={{ color: CHART_CHROME.secondaryInk }}
            formatter={(value: number) => [`${value.toFixed(0)} ${tCommon("sar")}`, t("revenue")]}
          />
          <Area type="monotone" dataKey="revenue" stroke={CATEGORICAL[0]} strokeWidth={2} fill="url(#revenueFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
