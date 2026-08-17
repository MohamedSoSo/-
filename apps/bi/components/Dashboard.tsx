"use client";

import { useState } from "react";
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

const TABS = ["Overview", "Menu Engineering", "Yield & Purchasing", "Operations", "Customers & Finance"] as const;
type Tab = (typeof TABS)[number];

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
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <main className="max-w-6xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-white">Owner BI</h1>
        <DateRangeFilter current={data.rangePreset} />
      </div>

      <InsightsBanner insights={data.insights} />

      <div className="flex gap-1 overflow-x-auto mb-6 border-b border-white/5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2 text-sm border-b-2 transition-colors ${
              tab === t ? "border-ember-500 text-white font-medium" : "border-transparent text-smoke-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Revenue" value={`${data.financial.revenue.toFixed(0)} SAR`} deltaPct={pctDelta(data.financial.revenue, data.priorFinancial.revenue)} />
            <StatTile label="Net profit" value={`${data.financial.netProfit.toFixed(0)} SAR`} deltaPct={pctDelta(data.financial.netProfit, data.priorFinancial.netProfit)} />
            <StatTile label="Orders" value={String(data.financial.completedOrderCount)} deltaPct={pctDelta(data.financial.completedOrderCount, data.priorFinancial.completedOrderCount)} />
            <StatTile label="Avg order value" value={`${data.financial.avgOrderValue.toFixed(0)} SAR`} deltaPct={pctDelta(data.financial.avgOrderValue, data.priorFinancial.avgOrderValue)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueTrendChart data={data.revenueSeries} />
            </div>
            <PaymentBreakdownChart data={data.financial.paymentBreakdown} />
          </div>
        </div>
      )}

      {tab === "Menu Engineering" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <BcgScatter items={data.bcg} />
          <CogsPanel ingredients={data.ingredients} usage={data.ingredientUsage} bcgItems={data.bcg} />
        </div>
      )}

      {tab === "Yield & Purchasing" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Logged waste (dropped/reject/etc.)" value={`${data.yieldAnalytics.totalDeclaredWasteKg.toFixed(1)} kg`} />
            <StatTile
              label="Unaccounted loss beyond expected"
              value={`${data.yieldAnalytics.byCategory.reduce((s, c) => s + c.totalUnaccountedLossKg, 0).toFixed(1)} kg`}
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <YieldChart rows={data.yieldAnalytics.byCategory} />
            <PurchasingForecastTable rows={data.purchasingForecast} />
          </div>
        </div>
      )}

      {tab === "Operations" && (
        <div className="space-y-4">
          <HourlyHeatmap cells={data.heatmap} />
          <div className="grid gap-4 lg:grid-cols-2">
            <GrillVelocityTable rows={data.grillVelocity} />
            <StaffLeaderboard rows={data.staffLeaderboard} />
          </div>
        </div>
      )}

      {tab === "Customers & Finance" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RfmPanel rows={data.rfm} />
          <ZReportTable shifts={data.shifts} staffNames={data.staffNames} />
        </div>
      )}
    </main>
  );
}
