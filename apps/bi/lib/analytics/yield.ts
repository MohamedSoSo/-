import type { BiDataset, RawOrderItem } from "../bi-data";

const SHIFT_LABELS = ["Late Night", "Morning", "Afternoon", "Evening"] as const;
type ShiftLabel = (typeof SHIFT_LABELS)[number];

function shiftOf(hour: number): ShiftLabel {
  if (hour < 6) return "Late Night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

export interface YieldRow {
  categoryId: string;
  categoryNameEn: string;
  categoryNameAr: string;
  expectedShrinkagePct: number | null;
  observedShrinkagePct: number; // average across measured items
  excessLossPct: number | null; // observed - expected, null if no expectation configured
  sampleCount: number;
  totalOrderedKg: number;
  totalActualKg: number;
  totalUnaccountedLossKg: number; // sum of (observed - expected) portions, only where positive
}

export interface ShiftYieldRow {
  shift: ShiftLabel;
  categoryId: string;
  categoryNameEn: string;
  categoryNameAr: string;
  observedShrinkagePct: number;
  sampleCount: number;
}

export interface YieldAnalytics {
  byCategory: YieldRow[];
  byShift: ShiftYieldRow[];
  totalDeclaredWasteKg: number; // from inventory_waste (theft/spoilage/over-portion/etc.)
}

function measuredWeightItems(items: RawOrderItem[]): RawOrderItem[] {
  return items.filter(
    (i) => i.is_weight_based && i.weight_grams_ordered && i.weight_grams_actual && i.status !== "voided"
  );
}

export function computeYieldAnalytics(dataset: BiDataset): YieldAnalytics {
  const measured = measuredWeightItems(dataset.orderItems);
  const categoryById = new Map(dataset.categories.map((c) => [c.id, c]));

  const byCategoryAcc = new Map<
    string,
    { orderedKg: number; actualKg: number; shrinkageSum: number; count: number; excessLossKg: number }
  >();

  for (const item of measured) {
    const category = categoryById.get(item.category_id);
    const acc = byCategoryAcc.get(item.category_id) ?? { orderedKg: 0, actualKg: 0, shrinkageSum: 0, count: 0, excessLossKg: 0 };
    const orderedKg = (item.weight_grams_ordered! * item.quantity) / 1000;
    const actualKg = (item.weight_grams_actual! * item.quantity) / 1000;
    const shrinkage = (item.weight_grams_ordered! - item.weight_grams_actual!) / item.weight_grams_ordered!;

    acc.orderedKg += orderedKg;
    acc.actualKg += actualKg;
    acc.shrinkageSum += shrinkage;
    acc.count += 1;
    if (category?.expected_shrinkage_pct != null && shrinkage > category.expected_shrinkage_pct) {
      acc.excessLossKg += (shrinkage - category.expected_shrinkage_pct) * orderedKg;
    }
    byCategoryAcc.set(item.category_id, acc);
  }

  const byCategory: YieldRow[] = Array.from(byCategoryAcc.entries()).map(([categoryId, acc]) => {
    const category = categoryById.get(categoryId);
    const observed = acc.count ? acc.shrinkageSum / acc.count : 0;
    return {
      categoryId,
      categoryNameEn: category?.name_en ?? "Unknown",
      categoryNameAr: category?.name_ar ?? "غير معروف",
      expectedShrinkagePct: category?.expected_shrinkage_pct ?? null,
      observedShrinkagePct: round3(observed),
      excessLossPct: category?.expected_shrinkage_pct != null ? round3(observed - category.expected_shrinkage_pct) : null,
      sampleCount: acc.count,
      totalOrderedKg: round2(acc.orderedKg),
      totalActualKg: round2(acc.actualKg),
      totalUnaccountedLossKg: round2(acc.excessLossKg),
    };
  });

  // Keyed by categoryId (not the display name) — same grouping semantics as
  // before (categories are already 1:1 with their name), just a more direct
  // identity to key on now that the display name is bilingual.
  const byShiftAcc = new Map<string, { shrinkageSum: number; count: number }>();
  for (const item of measured) {
    const shift = shiftOf(new Date(item.created_at).getHours());
    const key = `${shift}::${item.category_id}`;
    const acc = byShiftAcc.get(key) ?? { shrinkageSum: 0, count: 0 };
    acc.shrinkageSum += (item.weight_grams_ordered! - item.weight_grams_actual!) / item.weight_grams_ordered!;
    acc.count += 1;
    byShiftAcc.set(key, acc);
  }

  const byShift: ShiftYieldRow[] = Array.from(byShiftAcc.entries()).map(([key, acc]) => {
    const [shift, categoryId] = key.split("::") as [ShiftLabel, string];
    const category = categoryById.get(categoryId);
    return {
      shift,
      categoryId,
      categoryNameEn: category?.name_en ?? "Unknown",
      categoryNameAr: category?.name_ar ?? "غير معروف",
      observedShrinkagePct: round3(acc.shrinkageSum / acc.count),
      sampleCount: acc.count,
    };
  });

  const totalDeclaredWasteKg = round2(
    dataset.waste.reduce((sum, w) => sum + ((w.weight_grams ?? 0) * w.quantity) / 1000, 0)
  );

  return { byCategory, byShift, totalDeclaredWasteKg };
}

// ── predictive purchasing: day-of-week moving average of raw kg ordered ────
export interface PurchasingForecastRow {
  categoryNameEn: string;
  categoryNameAr: string;
  dayOfWeek: string;
  avgKgPerDay: number;
  sampleDays: number;
  forecastKg: number; // avgKgPerDay with a small safety margin
}

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function computePurchasingForecast(dataset: BiDataset): PurchasingForecastRow[] {
  const categoryById = new Map(dataset.categories.map((c) => [c.id, c]));
  const measured = dataset.orderItems.filter((i) => i.is_weight_based && i.weight_grams_ordered && i.status !== "voided");

  // kg ordered per (category, calendar day) so we can average per day-of-week
  const perDay = new Map<string, number>(); // key: categoryId::YYYY-MM-DD
  for (const item of measured) {
    const day = item.created_at.slice(0, 10);
    const key = `${item.category_id}::${day}`;
    perDay.set(key, (perDay.get(key) ?? 0) + (item.weight_grams_ordered! * item.quantity) / 1000);
  }

  // bucket those daily totals by (category, day-of-week)
  const byDow = new Map<string, { sum: number; days: number }>();
  for (const [key, kg] of perDay.entries()) {
    const [categoryId, day] = key.split("::") as [string, string];
    const dow = new Date(`${day}T12:00:00Z`).getUTCDay();
    const dowKey = `${categoryId}::${dow}`;
    const acc = byDow.get(dowKey) ?? { sum: 0, days: 0 };
    acc.sum += kg;
    acc.days += 1;
    byDow.set(dowKey, acc);
  }

  const rows: PurchasingForecastRow[] = [];
  for (const [key, acc] of byDow.entries()) {
    const [categoryId, dowStr] = key.split("::") as [string, string];
    const category = categoryById.get(categoryId);
    if (!category) continue;
    const avg = acc.sum / acc.days;
    rows.push({
      categoryNameEn: category.name_en,
      categoryNameAr: category.name_ar,
      dayOfWeek: DOW_NAMES[Number(dowStr)]!,
      avgKgPerDay: round2(avg),
      sampleDays: acc.days,
      forecastKg: round2(avg * 1.1), // 10% safety margin against stockout
    });
  }

  return rows.sort((a, b) => b.forecastKg - a.forecastKg);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
