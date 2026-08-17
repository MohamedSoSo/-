import { createClient } from "./supabase/server";
import type { OrderStatus } from "@bbq/types";

const ACTIVE_STATUSES: OrderStatus[] = ["placed", "confirmed", "grilling", "kitchen_prep", "plating", "ready"];

export interface KdsItem {
  id: string;
  order_id: string;
  station: string;
  quantity: number;
  weight_grams_ordered: number | null;
  doneness: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  menu_items: { name_en: string } | { name_en: string }[] | null;
  orders: { order_number: string; channel: string; restaurant_tables: { label: string } | { label: string }[] | null } | { order_number: string; channel: string; restaurant_tables: { label: string } | { label: string }[] | null }[] | null;
}

export async function getKdsItems(): Promise<KdsItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("order_items")
    .select(
      "id, order_id, station, quantity, weight_grams_ordered, doneness, notes, status, created_at, menu_items (name_en), orders (order_number, channel, restaurant_tables (label))"
    )
    .in("status", ACTIVE_STATUSES)
    .order("created_at");

  return (data ?? []) as unknown as KdsItem[];
}
