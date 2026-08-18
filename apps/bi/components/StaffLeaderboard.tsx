"use client";

import { useTranslations } from "next-intl";
import type { StaffLeaderboardRow } from "@/lib/analytics/operations";

export function StaffLeaderboard({ rows }: { rows: StaffLeaderboardRow[] }) {
  const t = useTranslations("staffLeaderboard");
  const tCommon = useTranslations("common");
  const chefs = rows.filter((r) => r.avgPrepMinutes != null).sort((a, b) => a.avgPrepMinutes! - b.avgPrepMinutes!);
  const cashiers = rows.filter((r) => r.avgTicketSar != null).sort((a, b) => b.avgTicketSar! - a.avgTicketSar!);

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">{t("title")}</h3>
      <p className="text-xs text-smoke-500 mb-3">{t("explain")}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">{t("noActivity")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium text-ember-400 mb-1.5">{t("grillKitchen")}</p>
            {chefs.length === 0 ? (
              <p className="text-xs text-smoke-500">{t("noKds")}</p>
            ) : (
              chefs.map((c) => (
                <div key={c.staffId} className="flex justify-between text-sm py-1 border-t border-white/5">
                  <span className="text-charcoal-100">{c.displayName}</span>
                  <span className="text-smoke-400 tabular-nums">
                    {c.avgPrepMinutes!.toFixed(1)}m · {t("itemsHandled", { count: c.itemsHandled })}
                  </span>
                </div>
              ))
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-ember-400 mb-1.5">{t("cashiers")}</p>
            {cashiers.length === 0 ? (
              <p className="text-xs text-smoke-500">{t("noPayments")}</p>
            ) : (
              cashiers.map((c) => (
                <div key={c.staffId} className="flex justify-between text-sm py-1 border-t border-white/5">
                  <span className="text-charcoal-100">{c.displayName}</span>
                  <span className={`tabular-nums ${(c.ticketVsTeamAvgPct ?? 0) >= 0 ? "text-emerald-400" : "text-smoke-400"}`}>
                    {c.avgTicketSar!.toFixed(0)} {tCommon("sar")}
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
