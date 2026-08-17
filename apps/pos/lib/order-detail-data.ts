import { createClient } from "./supabase/server";

export async function getOrderDetail(orderId: string) {
  const supabase = createClient();

  const [{ data: order }, { data: items }, { data: payments }, { data: tables }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, channel, status, table_id, subtotal, tax_total, discount_total, grand_total, zatca_qr_payload, zatca_signature_status, zatca_signed_at, placed_at, restaurant_tables (label)"
      )
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select("id, menu_item_id, quantity, weight_grams_ordered, weight_grams_actual, doneness, unit_price, line_total, status, station, menu_items (name_en)")
      .eq("order_id", orderId)
      .order("created_at"),
    supabase.from("payments").select("id, method, amount, is_refund, created_at").eq("order_id", orderId).order("created_at"),
    supabase.from("restaurant_tables").select("id, label").eq("is_active", true),
  ]);

  return { order, items: items ?? [], payments: payments ?? [], tables: tables ?? [] };
}
