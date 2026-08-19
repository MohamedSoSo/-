"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { DateRangePreset } from "@/lib/date-range";
import type { FinancialOverview, DailyRevenuePoint } from "@/lib/analytics/financial";
import type { BcgMenuItem } from "@/lib/analytics/bcg";
import type { YieldAnalytics, PurchasingForecastRow } from "@/lib/analytics/yield";
import type { HeatmapCell, GrillVelocity, StaffLeaderboardRow } from "@/lib/analytics/operations";
import type { RfmRow } from "@/lib/analytics/rfm";
import type { Insight } from "@/lib/insights-engine";
import type { RawShift, IngredientInfo, MenuItemIngredientUsage } from "@/lib/bi-data";

import { DateRangeFilter } from "./DateRangeFilter";
import { InsightsBanner } from "./InsightsBanner";
import { StatTile } from "./StatTile";
import { RevenueTrendChart } from "./charts/RevenueTrendChart";
import { PaymentBreakdownChart } from "./charts/PaymentBreakdownChart";
import { BcgScatter } from "./charts/BcgScatter";
import { YieldChart } from "./charts/YieldChart";
import { HourlyHeatmap } from "./charts/HourlyHeatmap";
import { PurchasingForecastTable } from "./PurchasingForecastTable";
import { GrillVelocityTable } from "./GrillVelocityTable";
import { StaffLeaderboard } from "./StaffLeaderboard";
import { ZReportTable } from "./ZReportTable";
import { CogsPanel } from "./CogsPanel";
import { RfmPanel } from "./RfmPanel";

const TAB_KEYS = ["overview", "menuEngineering", "yieldPurchasing", "operations", "customersFinance"] as const;
type Tab = (typeof TAB_KEYS)[number];

export interface DashboardData {
  rangePreset: DateRangePreset;
  periodLabel: string;
  financial: FinancialOverview;
  priorFinancial: FinancialOverview;
  revenueSeries: DailyRevenuePoint[];
  bcg: BcgMenuItem[];
  yieldAnalytics: YieldAnalytics;
  purchasingForecast: PurchasingForecastRow[];
  heatmap: HeatmapCell[];
  grillVelocity: GrillVelocity[];
  staffLeaderboard: StaffLeaderboardRow[];
  shifts: RawShift[];
  staffNames: Map<string, string>;
  insights: Insight[];
  rfm: RfmRow[];
  ingredients: IngredientInfo[];
  ingredientUsage: MenuItemIngredientUsage[];
}

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return null;
  return ((current - prior) / prior) * 100;
}

export function Dashboard({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-white">{t("title")}</h1>
        <DateRangeFilter current={data.rangePreset} />
      </div>

      <InsightsBanner insights={data.insights} />

      <div role="tablist" aria-label={t("tabsLabel")} className="flex gap-1 overflow-x-auto mb-6 border-b border-white/5">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            id={`bi-tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls={`bi-tabpanel-${key}`}
            onClick={() => setTab(key)}
            className={`shrink-0 px-4 py-2 text-sm border-b-2 transition-colors ${
              tab === key ? "border-ember-500 text-white font-medium" : "border-transparent text-smoke-400"
            }`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div role="tabpanel" id={`bi-tabpanel-${tab}`} aria-labelledby={`bi-tab-${tab}`} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("revenue")}
              value={`${data.financial.revenue.toFixed(0)} ${tCommon("sar")}`}
              deltaPct={pctDelta(data.financial.revenue, data.priorFinancial.revenue)}
            />
            <StatTile
              label={t("netProfit")}
              value={`${data.financial.netProfit.toFixed(0)} ${tCommon("sar")}`}
              deltaPct={pctDelta(data.financial.netProfit, data.priorFinancial.netProfit)}
            />
            <StatTile
              label={t("orders")}
              value={String(data.financial.completedOrderCount)}
              deltaPct={pctDelta(data.financial.completedOrderCount, data.priorFinancial.completedOrderCount)}
            />
            <StatTile
              label={t("avgOrderValue")}
              value={`${data.financial.avgOrderValue.toFixed(0)} ${tCommon("sar")}`}
              deltaPct={pctDelta(data.financial.avgOrderValue, data.priorFinancial.avgOrderValue)}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueTrendChart data={data.revenueSeries} />
            </div>
            <PaymentBreakdownChart data={data.financial.paymentBreakdown} />
          </div>
        </div>
      )}

      {tab === "menuEngineering" && (
        <div role="tabpanel" id={`bi-tabpanel-${tab}`} aria-labelledby={`bi-tab-${tab}`} className="grid gap-4 lg:grid-cols-2">
          <BcgScatter items={data.bcg} />
          <CogsPanel ingredients={data.ingredients} usage={data.ingredientUsage} bcgItems={data.bcg} />
        </div>
      )}

      {tab === "yieldPurchasing" && (
        <div role="tabpanel" id={`bi-tabpanel-${tab}`} aria-labelledby={`bi-tab-${tab}`} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label={t("loggedWaste")} value={`${data.yieldAnalytics.totalDeclaredWasteKg.toFixed(1)} kg`} />
            <StatTile
              label={t("unaccountedLoss")}
              value={`${data.yieldAnalytics.byCategory.reduce((s, c) => s + c.totalUnaccountedLossKg, 0).toFixed(1)} kg`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <YieldChart rows={data.yieldAnalytics.byCategory} />
            <PurchasingForecastTable rows={data.purchasingForecast} />
          </div>
        </div>
      )}

      {tab === "operations" && (
        <div role="tabpanel" id={`bi-tabpanel-${tab}`} aria-labelledby={`bi-tab-${tab}`} className="space-y-4">
          <HourlyHeatmap cells={data.heatmap} />
          <div className="grid gap-4 lg:grid-cols-2">
            <GrillVelocityTable rows={data.grillVelocity} />
            <StaffLeaderboard rows={data.staffLeaderboard} />
          </div>
        </div>
      )}

      {tab === "customersFinance" && (
        <div role="tabpanel" id={`bi-tabpanel-${tab}`} aria-labelledby={`bi-tab-${tab}`} className="grid gap-4 lg:grid-cols-2">
          <RfmPanel rows={data.rfm} />
          <ZReportTable shifts={data.shifts} staffNames={data.staffNames} />
        </div>
      )}
    </main>
  );
}
