import { createClient } from "./supabase/server";
import type { DonenessLevel, Station } from "@bbq/types";

export interface MenuWeightTier {
  id: string;
  label: string;
  grams: number;
  price_multiplier: number;
  sort_order: number;
}

export interface MenuModifier {
  id: string;
  name_en: string;
  name_ar: string;
  price_delta: number;
}

export interface MenuModifierGroup {
  id: string;
  name_en: string;
  name_ar: string;
  selection_type: "single" | "multiple";
  is_required: boolean;
  min_select: number;
  max_select: number;
  modifiers: MenuModifier[];
}

export interface MenuItemView {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  base_price: number;
  is_weight_based: boolean;
  default_weight_unit: "g" | "kg";
  supports_doneness: boolean;
  available_doneness_levels: DonenessLevel[];
  image_asset_key: string | null;
  item_type: "single" | "combo";
  default_station: Station;
  stock_quantity: number | null;
  category_id: string;
  weight_tiers: MenuWeightTier[];
  modifier_groups: MenuModifierGroup[];
}

export interface MenuCategoryView {
  id: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  items: MenuItemView[];
}

export async function getMenuData(): Promise<MenuCategoryView[]> {
  const supabase = createClient();

  const [{ data: categories }, { data: items }, { data: weightTiers }, { data: groupLinks }] = await Promise.all([
    supabase.from("categories").select("id, name_en, name_ar, sort_order").is("deleted_at", null).order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name_en, name_ar, description_en, base_price, is_weight_based, default_weight_unit, supports_doneness, available_doneness_levels, image_asset_key, item_type, default_station, stock_quantity, category_id"
      )
      .is("deleted_at", null)
      .eq("is_active", true),
    supabase.from("weight_tiers").select("id, menu_item_id, label, grams, price_multiplier, sort_order").order("sort_order"),
    supabase
      .from("menu_item_modifier_groups")
      .select(
        "menu_item_id, sort_order, modifier_groups (id, name_en, name_ar, selection_type, is_required, min_select, max_select, modifiers (id, name_en, name_ar, price_delta, is_active, sort_order))"
      )
      .order("sort_order"),
  ]);

  const weightTiersByItem = new Map<string, MenuWeightTier[]>();
  for (const wt of weightTiers ?? []) {
    const list = weightTiersByItem.get(wt.menu_item_id) ?? [];
    list.push(wt);
    weightTiersByItem.set(wt.menu_item_id, list);
  }

  interface RawModifierGroup {
    id: string;
    name_en: string;
    name_ar: string;
    selection_type: "single" | "multiple";
    is_required: boolean;
    min_select: number;
    max_select: number;
    modifiers: (MenuModifier & { is_active: boolean; sort_order: number })[];
  }

  const modifierGroupsByItem = new Map<string, MenuModifierGroup[]>();
  for (const link of groupLinks ?? []) {
    const group = link.modifier_groups as unknown as RawModifierGroup | null;
    if (!group) continue;
    const list = modifierGroupsByItem.get(link.menu_item_id) ?? [];
    list.push({
      ...group,
      modifiers: group.modifiers.filter((m) => m.is_active).sort((a, b) => a.sort_order - b.sort_order),
    });
    modifierGroupsByItem.set(link.menu_item_id, list);
  }

  const itemsByCategory = new Map<string, MenuItemView[]>();
  for (const item of items ?? []) {
    const view: MenuItemView = {
      ...item,
      weight_tiers: weightTiersByItem.get(item.id) ?? [],
      modifier_groups: modifierGroupsByItem.get(item.id) ?? [],
    };
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(view);
    itemsByCategory.set(item.category_id, list);
  }

  return (categories ?? []).map((c) => ({ ...c, items: itemsByCategory.get(c.id) ?? [] }));
}
