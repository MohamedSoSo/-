import type { RawShift } from "@/lib/bi-data";

export function ZReportTable({ shifts, staffNames }: { shifts: RawShift[]; staffNames: Map<string, string> }) {
  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">Z-Report history</h3>
      {shifts.length === 0 ? (
        <p className="text-sm text-smoke-400">No shifts closed in this period yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-smoke-500">
              <th className="font-normal pb-1">Date</th>
              <th className="font-normal pb-1">Cashier</th>
              <th className="font-normal pb-1 text-right">Expected</th>
              <th className="font-normal pb-1 text-right">Counted</th>
              <th className="font-normal pb-1 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-1.5 text-charcoal-100">{new Date(s.opened_at).toLocaleDateString()}</td>
                <td className="py-1.5 text-smoke-400">{staffNames.get(s.cashier_id) ?? "Unknown"}</td>
                <td className="py-1.5 text-right text-charcoal-100 tabular-nums">
                  {s.closing_balance_expected != null ? `${s.closing_balance_expected.toFixed(2)} SAR` : "—"}
                </td>
                <td className="py-1.5 text-right text-charcoal-100 tabular-nums">
                  {s.closing_balance_counted != null ? `${s.closing_balance_counted.toFixed(2)} SAR` : "—"}
                </td>
                <td
                  className={`py-1.5 text-right tabular-nums font-medium ${
                    s.cash_variance == null ? "text-smoke-500" : Math.abs(s.cash_variance) < 5 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {s.cash_variance != null ? `${s.cash_variance >= 0 ? "+" : ""}${s.cash_variance.toFixed(2)}` : "open"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
