import type { GrillVelocity } from "@/lib/analytics/operations";

export function GrillVelocityTable({ rows }: { rows: GrillVelocity[] }) {
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">Grill throughput by item</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">No grill status-change history in this period yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-smoke-500">
              <th className="font-normal pb-1">Item</th>
              <th className="font-normal pb-1 text-right">Avg time</th>
              <th className="font-normal pb-1 text-right">SLA breach</th>
              <th className="font-normal pb-1 text-right">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.menuItemName} className="border-t border-white/5">
                <td className="py-1.5 text-charcoal-100">{r.menuItemName}</td>
                <td className="py-1.5 text-right text-charcoal-100 tabular-nums">{r.avgMinutes.toFixed(1)}m</td>
                <td className={`py-1.5 text-right tabular-nums ${r.slaBreachPct >= 20 ? "text-red-400" : "text-smoke-400"}`}>
                  {r.slaBreachPct.toFixed(0)}%
                </td>
                <td className="py-1.5 text-right text-smoke-500 tabular-nums">{r.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
