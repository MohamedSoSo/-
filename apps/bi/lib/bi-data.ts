import { createClient } from "./supabase/server";
import type { DateRange } from "./date-range";
import type { DonenessLevel, OrderStatus, PaymentMethod, Station, WasteReason } from "@bbq/types";

export interface RawOrder {
  id: string;
  order_number: string;
  channel: string;
  status: OrderStatus;
  customer_id: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  placed_at: string;
}

export interface RawOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  station: Station;
  quantity: number;
  weight_grams_ordered: number | null;
  weight_grams_actual: number | null;
  doneness: DonenessLevel | null;
  unit_price: number;
  line_total: number;
  status: OrderStatus;
  created_at: string;
  menu_item_name: string;
  category_id: string;
  is_weight_based: boolean;
  base_cogs: number;
}

export interface RawPayment {
  id: string;
  order_id: string;
  method: PaymentMethod;
  amount: number;
  is_refund: boolean;
  tendered_by: string | null;
  created_at: string;
}

export interface RawWaste {
  id: string;
  menu_item_id: string;
  weight_grams: number | null;
  quantity: number;
  reason: WasteReason;
  staff_id: string | null;
  created_at: string;
}

export interface RawStatusEvent {
  id: string;
  order_item_id: string;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  staff_id: string | null;
  created_at: string;
}

export interface RawShift {
  id: string;
  cashier_id: string;
  opening_balance: number;
  closing_balance_expected: number | null;
  closing_balance_counted: number | null;
  cash_variance: number | null;
  opened_at: string;
  closed_at: string | null;
}

export interface CategoryInfo {
  id: string;
  name_en: string;
  expected_shrinkage_pct: number | null;
}

export interface IngredientInfo {
  id: string;
  name_en: string;
  unit_cost_per_kg: number;
}

export interface MenuItemIngredientUsage {
  menu_item_id: string;
  ingredient_id: string;
  kg_per_unit: number;
}

export interface StaffProfile {
  id: string;
  display_name: string;
  role: string;
}

export interface BiDataset {
  orders: RawOrder[];
  orderItems: RawOrderItem[];
  payments: RawPayment[];
  waste: RawWaste[];
  statusEvents: RawStatusEvent[];
  shifts: RawShift[];
  categories: CategoryInfo[];
  ingredients: IngredientInfo[];
  ingredientUsage: MenuItemIngredientUsage[];
  staff: StaffProfile[];
}

export async function getBiDataset(range: DateRange): Promise<BiDataset> {
  const supabase = createClient();

  const [
    { data: orders },
    { data: orderItemsRaw },
    { data: payments },
    { data: waste },
    { data: statusEvents },
    { data: shifts },
    { data: categories },
    { data: ingredients },
    { data: ingredientUsage },
    { data: staff },
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, channel, status, customer_id, subtotal, tax_total, discount_total, grand_total, placed_at")
      .gte("placed_at", range.startISO)
      .lt("placed_at", range.endISO)
      .is("deleted_at", null),
    supabase
      .from("order_items")
      .select(
        "id, order_id, menu_item_id, station, quantity, weight_grams_ordered, weight_grams_actual, doneness, unit_price, line_total, status, created_at, menu_items (name_en, category_id, is_weight_based, cogs)"
      )
      .gte("created_at", range.startISO)
      .lt("created_at", range.endISO),
    supabase
      .from("payments")
      .select("id, order_id, method, amount, is_refund, tendered_by, created_at")
      .gte("created_at", range.startISO)
      .lt("created_at", range.endISO),
    supabase
      .from("inventory_waste")
      .select("id, menu_item_id, weight_grams, quantity, reason, staff_id, created_at")
      .gte("created_at", range.startISO)
      .lt("created_at", range.endISO),
    supabase
      .from("order_item_status_events")
      .select("id, order_item_id, from_status, to_status, staff_id, created_at")
      .gte("created_at", range.startISO)
      .lt("created_at", range.endISO),
    supabase
      .from("shifts")
      .select("id, cashier_id, opening_balance, closing_balance_expected, closing_balance_counted, cash_variance, opened_at, closed_at")
      .gte("opened_at", range.startISO)
      .lt("opened_at", range.endISO)
      .order("opened_at", { ascending: false }),
    supabase.from("categories").select("id, name_en, expected_shrinkage_pct").is("deleted_at", null),
    supabase.from("ingredients").select("id, name_en, unit_cost_per_kg"),
    supabase.from("menu_item_ingredients").select("menu_item_id, ingredient_id, kg_per_unit"),
    supabase.from("profiles").select("id, display_name, role").eq("is_active", true),
  ]);

  const orderItems: RawOrderItem[] = (orderItemsRaw ?? []).map((raw) => {
    const menuItem = firstOf(raw.menu_items) as { name_en: string; category_id: string; is_weight_based: boolean; cogs: number } | null;
    return {
      id: raw.id,
      order_id: raw.order_id,
      menu_item_id: raw.menu_item_id,
      station: raw.station,
      quantity: raw.quantity,
      weight_grams_ordered: raw.weight_grams_ordered,
      weight_grams_actual: raw.weight_grams_actual,
      doneness: raw.doneness,
      unit_price: raw.unit_price,
      line_total: raw.line_total,
      status: raw.status,
      created_at: raw.created_at,
      menu_item_name: menuItem?.name_en ?? "Unknown item",
      category_id: menuItem?.category_id ?? "",
      is_weight_based: menuItem?.is_weight_based ?? false,
      base_cogs: menuItem?.cogs ?? 0,
    };
  });

  return {
    orders: orders ?? [],
    orderItems,
    payments: payments ?? [],
    waste: waste ?? [],
    statusEvents: statusEvents ?? [],
    shifts: shifts ?? [],
    categories: categories ?? [],
    ingredients: ingredients ?? [],
    ingredientUsage: ingredientUsage ?? [],
    staff: staff ?? [],
  };
}

function firstOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export interface RfmOrder {
  customer_id: string;
  grand_total: number;
  placed_at: string;
}

export interface RfmCustomer {
  id: string;
  display_name: string;
  phone: string | null;
}

/** All-time completed orders with a customer — RFM recency/frequency need
 * full history, not the dashboard's selected date range. */
export async function getRfmDataset(): Promise<{ orders: RfmOrder[]; customers: RfmCustomer[] }> {
  const supabase = createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("customer_id, grand_total, placed_at")
    .eq("status", "completed")
    .not("customer_id", "is", null)
    .is("deleted_at", null);

  const customerIds = Array.from(new Set((orders ?? []).map((o) => o.customer_id as string)));
  if (customerIds.length === 0) return { orders: [], customers: [] };

  const { data: customers } = await supabase.from("profiles").select("id, display_name, phone").in("id", customerIds);

  return {
    orders: (orders ?? []).filter((o): o is RfmOrder => !!o.customer_id),
    customers: customers ?? [],
  };
}
