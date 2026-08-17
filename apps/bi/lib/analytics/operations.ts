import type { BiDataset } from "../bi-data";

const DOW_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLA_BREACH_MINUTES = 12; // matches apps/pos SLA_RED_MINUTES

export interface HeatmapCell {
  dow: string;
  hour: number;
  orderCount: number;
}

export function computeHourlyHeatmap(dataset: BiDataset): HeatmapCell[] {
  const counts = new Map<string, number>();
  for (const order of dataset.orders) {
    const d = new Date(order.placed_at);
    const key = `${d.getDay()}::${d.getHours()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      cells.push({ dow: DOW_NAMES[dow]!, hour, orderCount: counts.get(`${dow}::${hour}`) ?? 0 });
    }
  }
  return cells;
}

export interface GrillVelocity {
  menuItemName: string;
  avgMinutes: number;
  slaBreachPct: number;
  sampleCount: number;
}

export function computeGrillVelocity(dataset: BiDataset): GrillVelocity[] {
  const grillingStarts = new Map<string, Date>(); // order_item_id -> grilling start time
  const readyTimes = new Map<string, Date>();

  for (const ev of dataset.statusEvents) {
    if (ev.to_status === "grilling") grillingStarts.set(ev.order_item_id, new Date(ev.created_at));
    if (ev.to_status === "ready") readyTimes.set(ev.order_item_id, new Date(ev.created_at));
  }

  const itemNameById = new Map(dataset.orderItems.map((i) => [i.id, i.menu_item_name]));
  const byItem = new Map<string, { totalMinutes: number; breaches: number; count: number }>();

  for (const [orderItemId, start] of grillingStarts.entries()) {
    const ready = readyTimes.get(orderItemId);
    if (!ready) continue;
    const minutes = (ready.getTime() - start.getTime()) / 60000;
    if (minutes < 0 || minutes > 180) continue; // guard against bad data

    const name = itemNameById.get(orderItemId) ?? "Unknown item";
    const acc = byItem.get(name) ?? { totalMinutes: 0, breaches: 0, count: 0 };
    acc.totalMinutes += minutes;
    acc.count += 1;
    if (minutes > SLA_BREACH_MINUTES) acc.breaches += 1;
    byItem.set(name, acc);
  }

  return Array.from(byItem.entries())
    .map(([menuItemName, acc]) => ({
      menuItemName,
      avgMinutes: round1(acc.totalMinutes / acc.count),
      slaBreachPct: round1((acc.breaches / acc.count) * 100),
      sampleCount: acc.count,
    }))
    .sort((a, b) => b.avgMinutes - a.avgMinutes);
}

export interface StaffLeaderboardRow {
  staffId: string;
  displayName: string;
  role: string;
  // chef metrics
  avgPrepMinutes: number | null;
  itemsHandled: number;
  // cashier metrics
  avgTicketSar: number | null;
  ordersHandled: number;
  ticketVsTeamAvgPct: number | null; // + means above team average ticket
  // driver metrics
  avgDeliveryMinutes: number | null;
  deliveriesHandled: number;
}

export function computeStaffLeaderboard(dataset: BiDataset): StaffLeaderboardRow[] {
  const staffById = new Map(dataset.staff.map((s) => [s.id, s]));

  // chef prep speed from status events
  const chefAcc = new Map<string, { totalMinutes: number; count: number }>();
  const grillingStarts = new Map<string, { time: Date; staffId: string | null }>();
  for (const ev of dataset.statusEvents) {
    if (ev.to_status === "grilling") grillingStarts.set(ev.order_item_id, { time: new Date(ev.created_at), staffId: ev.staff_id });
    if (ev.to_status === "ready") {
      const start = grillingStarts.get(ev.order_item_id);
      if (!start || !ev.staff_id) continue;
      const minutes = (new Date(ev.created_at).getTime() - start.time.getTime()) / 60000;
      if (minutes < 0 || minutes > 180) continue;
      const acc = chefAcc.get(ev.staff_id) ?? { totalMinutes: 0, count: 0 };
      acc.totalMinutes += minutes;
      acc.count += 1;
      chefAcc.set(ev.staff_id, acc);
    }
  }

  // cashier avg ticket from payments.tendered_by
  const orderById = new Map(dataset.orders.map((o) => [o.id, o]));
  const cashierAcc = new Map<string, { total: number; count: number }>();
  for (const p of dataset.payments) {
    if (p.is_refund || !p.order_id || !p.tendered_by) continue;
    const order = orderById.get(p.order_id);
    if (!order || order.status !== "completed") continue;
    const acc = cashierAcc.get(p.tendered_by) ?? { total: 0, count: 0 };
    acc.total += order.grand_total;
    acc.count += 1;
    cashierAcc.set(p.tendered_by, acc);
  }
  const teamAvgTicket =
    Array.from(cashierAcc.values()).reduce((s, a) => s + a.total, 0) /
    Math.max(1, Array.from(cashierAcc.values()).reduce((s, a) => s + a.count, 0));

  // driver avg delivery duration (proxy: placed_at -> updated_at isn't in our
  // dataset since we don't fetch updated_at — see note below).
  const staffIds = new Set<string>([...chefAcc.keys(), ...cashierAcc.keys()]);

  return Array.from(staffIds)
    .map((staffId) => {
      const staff = staffById.get(staffId);
      const chef = chefAcc.get(staffId);
      const cashier = cashierAcc.get(staffId);
      return {
        staffId,
        displayName: staff?.display_name ?? "Unknown",
        role: staff?.role ?? "unknown",
        avgPrepMinutes: chef ? round1(chef.totalMinutes / chef.count) : null,
        itemsHandled: chef?.count ?? 0,
        avgTicketSar: cashier ? round1(cashier.total / cashier.count) : null,
        ordersHandled: cashier?.count ?? 0,
        ticketVsTeamAvgPct: cashier && teamAvgTicket > 0 ? round1((cashier.total / cashier.count / teamAvgTicket - 1) * 100) : null,
        avgDeliveryMinutes: null,
        deliveriesHandled: 0,
      };
    })
    .sort((a, b) => (b.itemsHandled + b.ordersHandled) - (a.itemsHandled + a.ordersHandled));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
