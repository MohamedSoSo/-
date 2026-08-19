"use client";

import { useLocale, useTranslations } from "next-intl";
import type { PurchasingForecastRow } from "@/lib/analytics/yield";
import { localizedField, type Locale } from "@bbq/i18n";

export function PurchasingForecastTable({ rows }: { rows: PurchasingForecastRow[] }) {
  const t = useTranslations("purchasingForecastTable");
  const weekendRows = rows.filter((r) => r.dayOfWeek === "Friday" || r.dayOfWeek === "Saturday");
  const otherRows = rows.filter((r) => r.dayOfWeek !== "Friday" && r.dayOfWeek !== "Saturday");

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">{t("title")}</h3>
      <p className="text-xs text-smoke-400 mb-3">{t("explain")}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">{t("noData")}</p>
      ) : (
        <>
          {weekendRows.length > 0 && (
            <>
              <p className="text-xs font-medium text-ember-400 mb-1.5">{t("weekend")}</p>
              <Table rows={weekendRows} />
            </>
          )}
          {otherRows.length > 0 && (
            <>
              <p className="text-xs font-medium text-smoke-400 mt-3 mb-1.5">{t("weekdays")}</p>
              <Table rows={otherRows} />
            </>
          )}
        </>
      )}
    </div>
  );
}

function Table({ rows }: { rows: PurchasingForecastRow[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("purchasingForecastTable");
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-start text-xs text-smoke-400">
          <th scope="col" className="font-normal pb-1">{t("category")}</th>
          <th scope="col" className="font-normal pb-1">{t("day")}</th>
          <th scope="col" className="font-normal pb-1 text-end">{t("avgKg")}</th>
          <th scope="col" className="font-normal pb-1 text-end">{t("forecast")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-white/5">
            <td className="py-1.5 text-charcoal-100">{localizedField(r.categoryNameEn, r.categoryNameAr, locale)}</td>
            <td className="py-1.5 text-smoke-400">{r.dayOfWeek}</td>
            <td className="py-1.5 text-end text-charcoal-100 tabular-nums">{r.avgKgPerDay.toFixed(1)}kg</td>
            <td className="py-1.5 text-end text-ember-400 font-medium tabular-nums">{r.forecastKg.toFixed(1)}kg</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
