import type { RfmCustomer, RfmOrder } from "../bi-data";

export type RfmSegment = "champion" | "at_risk" | "churned" | "developing";

export interface RfmRow {
  customerId: string;
  displayName: string;
  phone: string | null;
  recencyDays: number;
  frequency: number;
  monetary: number;
  segment: RfmSegment;
}

const CHURNED_DAYS = 45;
const AT_RISK_DAYS = 21;
const CHAMPION_MIN_ORDERS = 3;

export function computeRfm(orders: RfmOrder[], customers: RfmCustomer[], now: Date): RfmRow[] {
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const byCustomer = new Map<string, { total: number; count: number; lastOrder: Date }>();

  for (const order of orders) {
    const acc = byCustomer.get(order.customer_id) ?? { total: 0, count: 0, lastOrder: new Date(0) };
    acc.total += order.grand_total;
    acc.count += 1;
    const placedAt = new Date(order.placed_at);
    if (placedAt > acc.lastOrder) acc.lastOrder = placedAt;
    byCustomer.set(order.customer_id, acc);
  }

  return Array.from(byCustomer.entries())
    .map(([customerId, acc]) => {
      const recencyDays = Math.floor((now.getTime() - acc.lastOrder.getTime()) / 86400000);
      const segment: RfmSegment =
        recencyDays > CHURNED_DAYS
          ? "churned"
          : recencyDays > AT_RISK_DAYS
            ? "at_risk"
            : acc.count >= CHAMPION_MIN_ORDERS
              ? "champion"
              : "developing";

      const customer = customerById.get(customerId);
      return {
        customerId,
        displayName: customer?.display_name ?? "Unknown",
        phone: customer?.phone ?? null,
        recencyDays,
        frequency: acc.count,
        monetary: Math.round(acc.total * 100) / 100,
        segment,
      };
    })
    .sort((a, b) => b.monetary - a.monetary);
}

export const SEGMENT_LABELS: Record<RfmSegment, string> = {
  champion: "Champions",
  at_risk: "At-Risk",
  churned: "Churned",
  developing: "Developing",
};
