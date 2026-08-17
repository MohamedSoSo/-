"use client";

import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from "recharts";
import type { BcgMenuItem, BcgQuadrant } from "@/lib/analytics/bcg";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";

const QUADRANT_COLOR: Record<BcgQuadrant, string> = {
  star: CATEGORICAL[2], // aqua — good
  plowhorse: CATEGORICAL[0], // blue
  puzzle: CATEGORICAL[6], // violet
  dog: CATEGORICAL[7], // red
};

const QUADRANT_LABEL: Record<BcgQuadrant, string> = {
  star: "Star",
  plowhorse: "Plowhorse",
  puzzle: "Puzzle",
  dog: "Dog",
};

export function BcgScatter({ items }: { items: BcgMenuItem[] }) {
  if (items.length === 0) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-medium text-charcoal-100 mb-1">BCG menu matrix</h3>
        <p className="text-sm text-smoke-400">No sales in this period yet.</p>
      </div>
    );
  }

  const medianUnits = median(items.map((i) => i.unitsSold));
  const medianMargin = median(items.map((i) => i.marginPct));

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-charcoal-100">BCG menu matrix</h3>
        <div className="flex gap-3 text-[11px]">
          {(Object.keys(QUADRANT_LABEL) as BcgQuadrant[]).map((q) => (
            <span key={q} className="flex items-center gap-1 text-smoke-400">
              <span className="h-2 w-2 rounded-full" style={{ background: QUADRANT_COLOR[q] }} />
              {QUADRANT_LABEL[q]}
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
            name="Units sold"
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={{ stroke: CHART_CHROME.baseline }}
            tickLine={false}
            label={{ value: "Units sold →", position: "insideBottom", offset: -4, fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="marginPct"
            name="Margin"
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            tick={{ fill: CHART_CHROME.mutedInk, fontSize: 11 }}
            axisLine={{ stroke: CHART_CHROME.baseline }}
            tickLine={false}
            label={{ value: "Margin % →", angle: -90, position: "insideLeft", fill: CHART_CHROME.mutedInk, fontSize: 11 }}
          />
          <ReferenceLine x={medianUnits} stroke={CHART_CHROME.baseline} strokeDasharray="3 3" />
          <ReferenceLine y={medianMargin} stroke={CHART_CHROME.baseline} strokeDasharray="3 3" />
          <Tooltip
            cursor={{ stroke: CHART_CHROME.baseline }}
            contentStyle={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_CHROME.primaryInk }}
            formatter={(value: number, name: string) => [name === "Margin" ? `${(value * 100).toFixed(0)}%` : value, name]}
            labelFormatter={() => ""}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as BcgMenuItem | undefined;
              if (!p) return null;
              return (
                <div style={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8, padding: 8 }}>
                  <p style={{ color: CHART_CHROME.primaryInk, fontSize: 12, fontWeight: 600 }}>{p.name}</p>
                  <p style={{ color: CHART_CHROME.secondaryInk, fontSize: 11 }}>
                    {p.unitsSold} units · {(p.marginPct * 100).toFixed(0)}% margin · {QUADRANT_LABEL[p.quadrant]}
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
