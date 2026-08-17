import type { FinancialOverview } from "./analytics/financial";
import type { YieldAnalytics } from "./analytics/yield";
import type { BcgMenuItem } from "./analytics/bcg";
import type { RawShift } from "./bi-data";

/**
 * Deterministic, rule-based daily narrative — NOT an LLM call. Every
 * sentence traces to a real computed delta, which is why it's trustworthy
 * enough to hand to an owner unsupervised. Swap in a real LLM later by
 * having it narrate `buildInsightFacts()`'s output instead of these
 * templates — the facts layer is already separated out for that.
 */

export type InsightSeverity = "good" | "warning" | "critical";

export interface Insight {
  severity: InsightSeverity;
  text: string;
}

export interface InsightInputs {
  current: FinancialOverview;
  prior: FinancialOverview;
  yieldAnalytics: YieldAnalytics;
  bcg: BcgMenuItem[];
  shifts: RawShift[];
  periodLabel: string;
}

export function generateInsights(inputs: InsightInputs): Insight[] {
  const insights: Insight[] = [];

  // ── revenue trend ──────────────────────────────────────────────────────
  if (inputs.prior.revenue > 0) {
    const deltaPct = ((inputs.current.revenue - inputs.prior.revenue) / inputs.prior.revenue) * 100;
    if (Math.abs(deltaPct) >= 10) {
      insights.push({
        severity: deltaPct > 0 ? "good" : "warning",
        text: `Revenue ${deltaPct > 0 ? "rose" : "fell"} ${Math.abs(deltaPct).toFixed(0)}% vs. the prior period (${inputs.prior.revenue.toFixed(0)} → ${inputs.current.revenue.toFixed(0)} SAR).`,
      });
    }
  }

  // ── shift-level yield shrinkage outliers ────────────────────────────────
  const overallByCategory = new Map(inputs.yieldAnalytics.byCategory.map((c) => [c.categoryName, c]));
  for (const row of inputs.yieldAnalytics.byShift) {
    if (row.sampleCount < 3) continue; // not enough samples to trust
    const overall = overallByCategory.get(row.categoryName);
    if (!overall || overall.expectedShrinkagePct == null) continue;
    const deltaPct = (row.observedShrinkagePct - overall.expectedShrinkagePct) * 100;
    if (deltaPct >= 5) {
      insights.push({
        severity: deltaPct >= 10 ? "critical" : "warning",
        text: `${row.categoryName} yield shrinkage ran ${deltaPct.toFixed(0)} points above expected during the ${row.shift} shift (${(row.observedShrinkagePct * 100).toFixed(0)}% observed vs. ${(overall.expectedShrinkagePct * 100).toFixed(0)}% expected). Recommend calibrating scale weights or reviewing portioning for that shift.`,
      });
    }
  }

  // ── unaccounted loss ────────────────────────────────────────────────────
  const totalUnaccountedKg = inputs.yieldAnalytics.byCategory.reduce((s, c) => s + c.totalUnaccountedLossKg, 0);
  if (totalUnaccountedKg >= 2) {
    insights.push({
      severity: totalUnaccountedKg >= 5 ? "critical" : "warning",
      text: `${totalUnaccountedKg.toFixed(1)}kg of meat was lost beyond expected cooking shrinkage this period — worth investigating for over-portioning or spoilage.`,
    });
  }

  // ── cancellation/void rate ───────────────────────────────────────────────
  const failureRate = inputs.current.orderCount
    ? ((inputs.current.cancelledOrderCount + inputs.current.voidedOrderCount) / inputs.current.orderCount) * 100
    : 0;
  if (failureRate >= 8) {
    insights.push({
      severity: failureRate >= 15 ? "critical" : "warning",
      text: `${failureRate.toFixed(0)}% of orders this period were cancelled or voided — above the healthy range. Check for a recurring cause (stock-outs, order errors).`,
    });
  }

  // ── menu engineering: high-revenue Dogs ─────────────────────────────────
  const totalRevenue = inputs.bcg.reduce((s, i) => s + i.revenue, 0);
  const dogsRevenueShare = totalRevenue
    ? inputs.bcg.filter((i) => i.quadrant === "dog").reduce((s, i) => s + i.revenue, 0) / totalRevenue
    : 0;
  if (dogsRevenueShare >= 0.15) {
    insights.push({
      severity: "warning",
      text: `Low-margin, low-volume "Dog" items still account for ${(dogsRevenueShare * 100).toFixed(0)}% of revenue — consider repricing or retiring the weakest of them.`,
    });
  }

  // ── cash variance ────────────────────────────────────────────────────────
  const bigVariance = inputs.shifts.filter((s) => s.cash_variance != null && Math.abs(s.cash_variance) >= 20);
  for (const s of bigVariance.slice(0, 3)) {
    insights.push({
      severity: Math.abs(s.cash_variance!) >= 50 ? "critical" : "warning",
      text: `Shift closed on ${new Date(s.opened_at).toLocaleDateString()} had a ${s.cash_variance! > 0 ? "overage" : "shortage"} of ${Math.abs(s.cash_variance!).toFixed(0)} SAR — worth a register recount or camera review.`,
    });
  }

  if (insights.length === 0) {
    insights.push({ severity: "good", text: `No material anomalies detected for ${inputs.periodLabel.toLowerCase()} — operations are tracking within expected ranges.` });
  }

  return insights;
}
