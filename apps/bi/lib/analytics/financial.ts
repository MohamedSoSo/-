import type { BiDataset } from "../bi-data";
import type { DateRange } from "../date-range";
import { computeCogs } from "./cogs";

const COMPLETED = "completed";

export interface FinancialOverview {
  revenue: number; // grand_total of completed orders
  netProfit: number; // revenue - COGS - discounts
  taxCollected: number;
  discountsGiven: number;
  orderCount: number;
  completedOrderCount: number;
  cancelledOrderCount: number;
  voidedOrderCount: number;
  avgOrderValue: number;
  paymentBreakdown: { method: string; amount: number; count: number }[];
}

export function computeFinancialOverview(dataset: BiDataset): FinancialOverview {
  const completed = dataset.orders.filter((o) => o.status === COMPLETED);
  const cancelled = dataset.orders.filter((o) => o.status === "cancelled");
  const voided = dataset.orders.filter((o) => o.status === "voided");

  const revenue = round2(completed.reduce((sum, o) => sum + o.grand_total, 0));
  const taxCollected = round2(completed.reduce((sum, o) => sum + o.tax_total, 0));
  const discountsGiven = round2(dataset.orders.reduce((sum, o) => sum + o.discount_total, 0));

  const completedOrderIds = new Set(completed.map((o) => o.id));
  const completedItems = dataset.orderItems.filter((i) => completedOrderIds.has(i.order_id) && i.status !== "voided");
  const totalCogs = round2(
    completedItems.reduce((sum, item) => sum + computeCogs(item, dataset.ingredientUsage, dataset.ingredients) * item.quantity, 0)
  );

  const netProfit = round2(revenue - totalCogs - discountsGiven);

  const paymentsByMethod = new Map<string, { amount: number; count: number }>();
  for (const p of dataset.payments) {
    if (p.is_refund) continue;
    const entry = paymentsByMethod.get(p.method) ?? { amount: 0, count: 0 };
    entry.amount += p.amount;
    entry.count += 1;
    paymentsByMethod.set(p.method, entry);
  }

  return {
    revenue,
    netProfit,
    taxCollected,
    discountsGiven,
    orderCount: dataset.orders.length,
    completedOrderCount: completed.length,
    cancelledOrderCount: cancelled.length,
    voidedOrderCount: voided.length,
    avgOrderValue: completed.length ? round2(revenue / completed.length) : 0,
    paymentBreakdown: Array.from(paymentsByMethod.entries()).map(([method, v]) => ({
      method,
      amount: round2(v.amount),
      count: v.count,
    })),
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface DailyRevenuePoint {
  date: string; // YYYY-MM-DD
  label: string; // short display label
  revenue: number;
  orders: number;
}

export function computeDailyRevenueSeries(dataset: BiDataset, range: DateRange): DailyRevenuePoint[] {
  const byDay = new Map<string, { revenue: number; orders: number }>();
  for (const o of dataset.orders) {
    if (o.status !== COMPLETED) continue;
    const day = o.placed_at.slice(0, 10);
    const acc = byDay.get(day) ?? { revenue: 0, orders: 0 };
    acc.revenue += o.grand_total;
    acc.orders += 1;
    byDay.set(day, acc);
  }

  const points: DailyRevenuePoint[] = [];
  const cursor = new Date(range.startISO);
  const end = new Date(range.endISO);
  while (cursor < end) {
    const day = cursor.toISOString().slice(0, 10);
    const acc = byDay.get(day) ?? { revenue: 0, orders: 0 };
    points.push({
      date: day,
      label: cursor.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      revenue: round2(acc.revenue),
      orders: acc.orders,
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}
