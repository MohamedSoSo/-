import type { BiDataset } from "../bi-data";
import { computeCogs } from "./cogs";

export type BcgQuadrant = "star" | "plowhorse" | "puzzle" | "dog";

export interface BcgMenuItem {
  menuItemId: string;
  name: string;
  unitsSold: number;
  revenue: number;
  cogsTotal: number;
  marginPct: number; // 0-1
  quadrant: BcgQuadrant;
}

/**
 * Classic BCG menu-engineering split: median units sold divides volume,
 * median margin % divides profitability. Voided items are excluded — they
 * generated no revenue.
 */
export function computeBcgMatrix(dataset: BiDataset): BcgMenuItem[] {
  const byItem = new Map<string, { name: string; unitsSold: number; revenue: number; cogsTotal: number }>();

  for (const item of dataset.orderItems) {
    if (item.status === "voided") continue;
    const entry = byItem.get(item.menu_item_id) ?? { name: item.menu_item_name, unitsSold: 0, revenue: 0, cogsTotal: 0 };
    entry.unitsSold += item.quantity;
    entry.revenue += item.line_total;
    entry.cogsTotal += computeCogs(item, dataset.ingredientUsage, dataset.ingredients) * item.quantity;
    byItem.set(item.menu_item_id, entry);
  }

  const rows = Array.from(byItem.entries()).map(([menuItemId, v]) => ({
    menuItemId,
    name: v.name,
    unitsSold: v.unitsSold,
    revenue: round2(v.revenue),
    cogsTotal: round2(v.cogsTotal),
    marginPct: v.revenue > 0 ? (v.revenue - v.cogsTotal) / v.revenue : 0,
  }));

  if (rows.length === 0) return [];

  const medianUnits = median(rows.map((r) => r.unitsSold));
  const medianMargin = median(rows.map((r) => r.marginPct));

  return rows.map((r) => {
    const highVolume = r.unitsSold >= medianUnits;
    const highMargin = r.marginPct >= medianMargin;
    const quadrant: BcgQuadrant = highVolume && highMargin ? "star" : highVolume ? "plowhorse" : highMargin ? "puzzle" : "dog";
    return { ...r, quadrant };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
