import type { FinancialOverview } from "./analytics/financial";
import type { YieldAnalytics } from "./analytics/yield";
import type { BcgMenuItem } from "./analytics/bcg";
import type { RawShift } from "./bi-data";
import type { DateRangePreset } from "./date-range";

/**
 * Deterministic, rule-based daily narrative — NOT an LLM call. Every
 * sentence traces to a real computed delta, which is why it's trustworthy
 * enough to hand to an owner unsupervised. Swap in a real LLM later by
 * having it narrate `buildInsightFacts()`'s output instead of these
 * templates — the facts layer is already separated out for that.
 *
 * Text is NOT rendered here — this module has no locale context. Each
 * insight carries a `key` into messages/{en,ar}.json's "insights" namespace
 * plus a flat `values` bag for ICU interpolation; InsightsBanner.tsx (which
 * knows the active locale) resolves bilingual names, formats dates, and
 * calls t(key, values).
 */

export type InsightSeverity = "good" | "warning" | "critical";

export interface Insight {
  severity: InsightSeverity;
  key: string;
  values: Record<string, string | number>;
}

export interface InsightInputs {
  current: FinancialOverview;
  prior: FinancialOverview;
  yieldAnalytics: YieldAnalytics;
  bcg: BcgMenuItem[];
  shifts: RawShift[];
  periodPreset: DateRangePreset;
}

export function generateInsights(inputs: InsightInputs): Insight[] {
  const insights: Insight[] = [];

  // ── revenue trend ──────────────────────────────────────────────────────
  if (inputs.prior.revenue > 0) {
    const deltaPct = ((inputs.current.revenue - inputs.prior.revenue) / inputs.prior.revenue) * 100;
    if (Math.abs(deltaPct) >= 10) {
      insights.push({
        severity: deltaPct > 0 ? "good" : "warning",
        key: "revenueTrend",
        values: {
          direction: deltaPct > 0 ? "increase" : "decrease",
          deltaPct: Math.abs(deltaPct).toFixed(0),
          priorRevenue: inputs.prior.revenue.toFixed(0),
          currentRevenue: inputs.current.revenue.toFixed(0),
        },
      });
    }
  }

  // ── shift-level yield shrinkage outliers ────────────────────────────────
  const overallByCategory = new Map(inputs.yieldAnalytics.byCategory.map((c) => [c.categoryId, c]));
  for (const row of inputs.yieldAnalytics.byShift) {
    if (row.sampleCount < 3) continue; // not enough samples to trust
    const overall = overallByCategory.get(row.categoryId);
    if (!overall || overall.expectedShrinkagePct == null) continue;
    const deltaPct = (row.observedShrinkagePct - overall.expectedShrinkagePct) * 100;
    if (deltaPct >= 5) {
      insights.push({
        severity: deltaPct >= 10 ? "critical" : "warning",
        key: "yieldShrinkageOutlier",
        values: {
          categoryNameEn: row.categoryNameEn,
          categoryNameAr: row.categoryNameAr,
          shift: row.shift,
          deltaPct: deltaPct.toFixed(0),
          observedPct: (row.observedShrinkagePct * 100).toFixed(0),
          expectedPct: (overall.expectedShrinkagePct * 100).toFixed(0),
        },
      });
    }
  }

  // ── unaccounted loss ────────────────────────────────────────────────────
  const totalUnaccountedKg = inputs.yieldAnalytics.byCategory.reduce((s, c) => s + c.totalUnaccountedLossKg, 0);
  if (totalUnaccountedKg >= 2) {
    insights.push({
      severity: totalUnaccountedKg >= 5 ? "critical" : "warning",
      key: "unaccountedLoss",
      values: { kg: totalUnaccountedKg.toFixed(1) },
    });
  }

  // ── cancellation/void rate ───────────────────────────────────────────────
  const failureRate = inputs.current.orderCount
    ? ((inputs.current.cancelledOrderCount + inputs.current.voidedOrderCount) / inputs.current.orderCount) * 100
    : 0;
  if (failureRate >= 8) {
    insights.push({
      severity: failureRate >= 15 ? "critical" : "warning",
      key: "cancellationRate",
      values: { pct: failureRate.toFixed(0) },
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
      key: "dogsRevenueShare",
      values: { pct: (dogsRevenueShare * 100).toFixed(0) },
    });
  }

  // ── cash variance ────────────────────────────────────────────────────────
  const bigVariance = inputs.shifts.filter((s) => s.cash_variance != null && Math.abs(s.cash_variance) >= 20);
  for (const s of bigVariance.slice(0, 3)) {
    insights.push({
      severity: Math.abs(s.cash_variance!) >= 50 ? "critical" : "warning",
      key: "cashVariance",
      values: {
        direction: s.cash_variance! > 0 ? "overage" : "shortage",
        date: s.opened_at,
        amount: Math.abs(s.cash_variance!).toFixed(0),
      },
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "good",
      key: "noAnomalies",
      values: { periodPreset: periodPresetKey(inputs.periodPreset) },
    });
  }

  return insights;
}

// ICU select case names must be valid bare identifiers — "7d"/"30d" aren't,
// so map the raw preset to safe case names used in messages/*.json.
function periodPresetKey(preset: DateRangePreset): string {
  if (preset === "today") return "today";
  if (preset === "7d") return "sevenDays";
  if (preset === "30d") return "thirtyDays";
  return "other";
}
