"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { CATEGORICAL, CHART_CHROME } from "@/lib/chart-colors";

export function PaymentBreakdownChart({ data }: { data: { method: string; amount: number; count: number }[] }) {
  const sorted = [...data]
    .map((d) => ({ ...d, method: capitalize(d.method) }))
    .sort((a, b) => b.amount - a.amount);
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">Payment methods</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={CHART_CHROME.gridline} horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="method"
            tick={{ fill: CHART_CHROME.secondaryInk, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={80}
          />
          <Tooltip
            contentStyle={{ background: CHART_CHROME.surface, border: `1px solid ${CHART_CHROME.gridline}`, borderRadius: 8 }}
            labelStyle={{ color: CHART_CHROME.primaryInk }}
            formatter={(value: number, _n, p) => [`${value.toFixed(0)} SAR (${p.payload.count} payments)`, ""]}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={18}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}
