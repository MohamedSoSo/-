import type { PurchasingForecastRow } from "@/lib/analytics/yield";

export function PurchasingForecastTable({ rows }: { rows: PurchasingForecastRow[] }) {
  const weekendRows = rows.filter((r) => r.dayOfWeek === "Friday" || r.dayOfWeek === "Saturday");
  const otherRows = rows.filter((r) => r.dayOfWeek !== "Friday" && r.dayOfWeek !== "Saturday");

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">Predictive purchasing (raw kg)</h3>
      <p className="text-xs text-smoke-500 mb-3">
        Day-of-week moving average of raw kg ordered, +10% safety margin. Not a trained model — a transparent average
        you can sanity-check against what you already know.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">Not enough weight-based order history yet to forecast.</p>
      ) : (
        <>
          {weekendRows.length > 0 && (
            <>
              <p className="text-xs font-medium text-ember-400 mb-1.5">Weekend (Fri/Sat)</p>
              <Table rows={weekendRows} />
            </>
          )}
          {otherRows.length > 0 && (
            <>
              <p className="text-xs font-medium text-smoke-400 mt-3 mb-1.5">Weekdays</p>
              <Table rows={otherRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Table({ rows }: { rows: PurchasingForecastRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-smoke-500">
          <th className="font-normal pb-1">Category</th>
          <th className="font-normal pb-1">Day</th>
          <th className="font-normal pb-1 text-right">Avg kg</th>
          <th className="font-normal pb-1 text-right">Forecast</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-white/5">
            <td className="py-1.5 text-charcoal-100">{r.categoryName}</td>
            <td className="py-1.5 text-smoke-400">{r.dayOfWeek}</td>
            <td className="py-1.5 text-right text-charcoal-100 tabular-nums">{r.avgKgPerDay.toFixed(1)}kg</td>
            <td className="py-1.5 text-right text-ember-400 font-medium tabular-nums">{r.forecastKg.toFixed(1)}kg</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
