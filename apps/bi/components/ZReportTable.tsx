"use client";

import { useTranslations } from "next-intl";
import type { RawShift } from "@/lib/bi-data";

export function ZReportTable({ shifts, staffNames }: { shifts: RawShift[]; staffNames: Map<string, string> }) {
  const t = useTranslations("zReportTable");
  const tCommon = useTranslations("common");

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">{t("title")}</h3>
      {shifts.length === 0 ? (
        <p className="text-sm text-smoke-400">{t("noShifts")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-smoke-400">
              <th scope="col" className="font-normal pb-1">{t("date")}</th>
              <th scope="col" className="font-normal pb-1">{t("cashier")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("expected")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("counted")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("variance")}</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-white/5">
                <td className="py-1.5 text-charcoal-100">{new Date(s.opened_at).toLocaleDateString()}</td>
                <td className="py-1.5 text-smoke-400">{staffNames.get(s.cashier_id) ?? t("unknown")}</td>
                <td className="py-1.5 text-end text-charcoal-100 tabular-nums">
                  {s.closing_balance_expected != null ? `${s.closing_balance_expected.toFixed(2)} ${tCommon("sar")}` : "—"}
                </td>
                <td className="py-1.5 text-end text-charcoal-100 tabular-nums">
                  {s.closing_balance_counted != null ? `${s.closing_balance_counted.toFixed(2)} ${tCommon("sar")}` : "—"}
                </td>
                <td
                  className={`py-1.5 text-end tabular-nums font-medium ${
                    s.cash_variance == null ? "text-smoke-400" : Math.abs(s.cash_variance) < 5 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {s.cash_variance != null ? `${s.cash_variance >= 0 ? "+" : ""}${s.cash_variance.toFixed(2)}` : t("open")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
