import { getBiDataset, getRfmDataset } from "@/lib/bi-data";
import { resolveRange, priorRange, type DateRangePreset } from "@/lib/date-range";
import { computeFinancialOverview, computeDailyRevenueSeries } from "@/lib/analytics/financial";
import { computeBcgMatrix } from "@/lib/analytics/bcg";
import { computeYieldAnalytics, computePurchasingForecast } from "@/lib/analytics/yield";
import { computeHourlyHeatmap, computeGrillVelocity, computeStaffLeaderboard } from "@/lib/analytics/operations";
import { computeRfm } from "@/lib/analytics/rfm";
import { generateInsights } from "@/lib/insights-engine";
import { Dashboard, type DashboardData } from "@/components/Dashboard";

export default async function BiHome({ searchParams }: { searchParams: { range?: string } }) {
  const rangePreset = (["today", "7d", "30d"].includes(searchParams.range ?? "") ? searchParams.range : "30d") as DateRangePreset;
  const range = resolveRange(rangePreset);
  const prior = priorRange(range);

  const [dataset, priorDataset, rfmSource] = await Promise.all([
    getBiDataset(range),
    getBiDataset(prior),
    getRfmDataset(),
  ]);

  const financial = computeFinancialOverview(dataset);
  const priorFinancial = computeFinancialOverview(priorDataset);
  const bcg = computeBcgMatrix(dataset);

  const data: DashboardData = {
    rangePreset,
    periodLabel: range.label,
    financial,
    priorFinancial,
    revenueSeries: computeDailyRevenueSeries(dataset, range),
    bcg,
    yieldAnalytics: computeYieldAnalytics(dataset),
    purchasingForecast: computePurchasingForecast(dataset),
    heatmap: computeHourlyHeatmap(dataset),
    grillVelocity: computeGrillVelocity(dataset),
    staffLeaderboard: computeStaffLeaderboard(dataset),
    shifts: dataset.shifts,
    staffNames: new Map(dataset.staff.map((s) => [s.id, s.display_name])),
    insights: generateInsights({
      current: financial,
      prior: priorFinancial,
      yieldAnalytics: computeYieldAnalytics(dataset),
      bcg,
      shifts: dataset.shifts,
      periodLabel: range.label,
    }),
    rfm: computeRfm(rfmSource.orders, rfmSource.customers, new Date()),
    ingredients: dataset.ingredients,
    ingredientUsage: dataset.ingredientUsage,
  };

  return <Dashboard data={data} />;
}
