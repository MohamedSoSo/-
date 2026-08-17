import type { StaffLeaderboardRow } from "@/lib/analytics/operations";

export function StaffLeaderboard({ rows }: { rows: StaffLeaderboardRow[] }) {
  const chefs = rows.filter((r) => r.avgPrepMinutes != null).sort((a, b) => a.avgPrepMinutes! - b.avgPrepMinutes!);
  const cashiers = rows.filter((r) => r.avgTicketSar != null).sort((a, b) => b.avgTicketSar! - a.avgTicketSar!);

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">Staff leaderboard</h3>
      <p className="text-xs text-smoke-500 mb-3">
        Normalized per staff member across the selected period. Driver delivery timing isn't populated yet — no
        delivery-assignment flow exists to attribute it.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">
          No staff-attributed activity yet — this fills in once staff sign in with PIN and work KDS tickets or take payments.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-ember-400 mb-1.5">Grill/kitchen — avg prep speed</p>
            {chefs.length === 0 ? (
              <p className="text-xs text-smoke-500">No KDS activity recorded yet.</p>
            ) : (
              chefs.map((c) => (
                <div key={c.staffId} className="flex justify-between text-sm py-1 border-t border-white/5">
                  <span className="text-charcoal-100">{c.displayName}</span>
                  <span className="text-smoke-400 tabular-nums">
                    {c.avgPrepMinutes!.toFixed(1)}m · {c.itemsHandled} items
                  </span>
                </div>
              ))
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-ember-400 mb-1.5">Cashiers — avg ticket size</p>
            {cashiers.length === 0 ? (
              <p className="text-xs text-smoke-500">No payments recorded yet.</p>
            ) : (
              cashiers.map((c) => (
                <div key={c.staffId} className="flex justify-between text-sm py-1 border-t border-white/5">
                  <span className="text-charcoal-100">{c.displayName}</span>
                  <span className={`tabular-nums ${(c.ticketVsTeamAvgPct ?? 0) >= 0 ? "text-emerald-400" : "text-smoke-400"}`}>
                    {c.avgTicketSar!.toFixed(0)} SAR
                    {c.ticketVsTeamAvgPct != null && ` (${c.ticketVsTeamAvgPct >= 0 ? "+" : ""}${c.ticketVsTeamAvgPct.toFixed(0)}%)`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
