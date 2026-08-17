import { createClient } from "./supabase/server";
import type { TableStatus, OrderStatus } from "@bbq/types";

export interface FloorTable {
  id: string;
  label: string;
  seats: number;
  status: TableStatus;
  position_x: number;
  position_y: number;
  active_order: { id: string; order_number: string; grand_total: number; status: string } | null;
}

const ACTIVE_STATUSES: OrderStatus[] = ["placed", "confirmed", "grilling", "kitchen_prep", "plating", "ready"];

export async function getFloorTables(): Promise<FloorTable[]> {
  const supabase = createClient();

  const [{ data: tables }, { data: orders }] = await Promise.all([
    supabase.from("restaurant_tables").select("id, label, seats, status, position_x, position_y").eq("is_active", true),
    supabase
      .from("orders")
      .select("id, order_number, grand_total, status, table_id")
      .eq("channel", "qr_table")
      .in("status", ACTIVE_STATUSES)
      .is("deleted_at", null),
  ]);

  const orderByTable = new Map<string, NonNullable<FloorTable["active_order"]>>();
  for (const order of orders ?? []) {
    if (!order.table_id) continue;
    // last-write-wins is fine here — a table with >1 concurrent active order
    // is an edge case the floor plan surfaces via the table detail view.
    orderByTable.set(order.table_id, {
      id: order.id,
      order_number: order.order_number,
      grand_total: order.grand_total,
      status: order.status,
    });
  }

  return (tables ?? []).map((t) => ({ ...t, active_order: orderByTable.get(t.id) ?? null }));
}
