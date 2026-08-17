"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import type { YieldRow } from "@/lib/analytics/yield";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";

export function YieldChart({ rows }: { rows: YieldRow[] }) {
  const data = rows.map((r) => ({
    name: r.categoryName,
    Observed: Math.round(r.observedShrinkagePct * 1000) / 10,
    Expected: r.expectedShrinkagePct != null ? Math.round(r.expectedShrinkagePct * 1000) / 10 : null,
  }));

  if (data.length === 0) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-medium text-charcoal-100 mb-1">Cooking yield vs. expected</h3>
        <p className="text-sm text-smoke-400">No weight-recorded grill items in this period yet.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">Cooking yield vs. expected</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={CHART_CHROME.gridline} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }} axisLine={{ stroke: CHART_CHROME.baseline }} tickLine={false} />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_CHROME.primaryInk }}
            formatter={(value: number) => [`${value}%`, ""]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: CHART_CHROME.secondaryInk }} />
          <Bar dataKey="Observed" fill={CATEGORICAL[1]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expected" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
