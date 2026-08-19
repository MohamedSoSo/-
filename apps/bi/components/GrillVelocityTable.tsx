"use client";

import { useLocale, useTranslations } from "next-intl";
import type { GrillVelocity } from "@/lib/analytics/operations";
import { localizedField, type Locale } from "@bbq/i18n";

export function GrillVelocityTable({ rows }: { rows: GrillVelocity[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("grillVelocityTable");

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-3">{t("title")}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">{t("noData")}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-xs text-smoke-400">
              <th scope="col" className="font-normal pb-1">{t("item")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("avgTime")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("slaBreach")}</th>
              <th scope="col" className="font-normal pb-1 text-end">{t("n")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.menuItemNameEn} className="border-t border-white/5">
                <td className="py-1.5 text-charcoal-100">{localizedField(r.menuItemNameEn, r.menuItemNameAr, locale)}</td>
                <td className="py-1.5 text-end text-charcoal-100 tabular-nums">{r.avgMinutes.toFixed(1)}m</td>
                <td className={`py-1.5 text-end tabular-nums ${r.slaBreachPct >= 20 ? "text-red-400" : "text-smoke-400"}`}>
                  {r.slaBreachPct.toFixed(0)}%
                </td>
                <td className="py-1.5 text-end text-smoke-400 tabular-nums">{r.sampleCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
