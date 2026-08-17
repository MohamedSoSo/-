import { createClient } from "./supabase/server";

export interface QuickMenuItem {
  id: string;
  name_en: string;
  base_price: number;
  is_weight_based: boolean;
  weight_tiers: { id: string; label: string; grams: number; price_multiplier: number }[];
}

export interface QuickMenuCategory {
  id: string;
  name_en: string;
  items: QuickMenuItem[];
}

/**
 * Deliberately simpler than the customer app's getMenuData(): no modifiers
 * or combo builder here. Staff quick-add covers the walk-in/phone-order
 * case fast; anything needing full customization goes through the customer
 * QR flow from the table instead.
 */
export async function getQuickMenu(): Promise<QuickMenuCategory[]> {
  const supabase = createClient();

  const [{ data: categories }, { data: items }, { data: weightTiers }] = await Promise.all([
    supabase.from("categories").select("id, name_en, sort_order").is("deleted_at", null).order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, name_en, base_price, is_weight_based, category_id")
      .is("deleted_at", null)
      .eq("is_active", true)
      .eq("item_type", "single"),
    supabase.from("weight_tiers").select("id, menu_item_id, label, grams, price_multiplier").order("sort_order"),
  ]);

  const tiersByItem = new Map<string, QuickMenuItem["weight_tiers"]>();
  for (const t of weightTiers ?? []) {
    const list = tiersByItem.get(t.menu_item_id) ?? [];
    list.push(t);
    tiersByItem.set(t.menu_item_id, list);
  }

  const itemsByCategory = new Map<string, QuickMenuItem[]>();
  for (const item of items ?? []) {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push({ ...item, weight_tiers: tiersByItem.get(item.id) ?? [] });
    itemsByCategory.set(item.category_id, list);
  }

  return (categories ?? []).map((c) => ({ ...c, items: itemsByCategory.get(c.id) ?? [] }));
}
