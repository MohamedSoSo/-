import { createClient } from "./supabase/client";
import type { CartItem } from "./cart-store";

/**
 * Rebuilds cart lines from a past order for "quick re-order". Modifier
 * selections come from order_item_modifiers' price/name snapshot (so a
 * re-order shows what was actually charged even if the modifier since
 * changed price or was retired). Weight tier and combo component names are
 * re-resolved against current menu data since order_items only stores the
 * grams value, not a tier id — if the exact tier no longer exists, we fall
 * back to the item's first available tier.
 */
export async function reconstructCartItems(orderId: string): Promise<CartItem[]> {
  const supabase = createClient();

  const { data: orderItems } = await supabase
    .from("order_items")
    .select(
      "id, menu_item_id, quantity, weight_grams_ordered, doneness, notes, menu_items (name_en, name_ar, base_price, image_asset_key, is_weight_based)"
    )
    .eq("order_id", orderId);

  if (!orderItems?.length) return [];

  const orderItemIds = orderItems.map((oi) => oi.id);

  const [{ data: modifierRows }, { data: componentRows }] = await Promise.all([
    supabase
      .from("order_item_modifiers")
      .select("order_item_id, modifier_id, name_snapshot, price_delta_snapshot")
      .in("order_item_id", orderItemIds),
    supabase
      .from("order_item_components")
      .select("order_item_id, combo_component_id, slot_label, component_menu_item_id, upcharge_snapshot, menu_items (name_en, name_ar)")
      .in("order_item_id", orderItemIds),
  ]);

  const cartItems: CartItem[] = [];

  for (const oi of orderItems) {
    const menuItem = oi.menu_items as unknown as {
      name_en: string;
      name_ar: string;
      base_price: number;
      image_asset_key: string | null;
      is_weight_based: boolean;
    } | null;
    if (!menuItem) continue;

    let weightTier: CartItem["weight_tier"] = null;
    if (menuItem.is_weight_based && oi.weight_grams_ordered) {
      const { data: tiers } = await supabase
        .from("weight_tiers")
        .select("id, label, grams, price_multiplier")
        .eq("menu_item_id", oi.menu_item_id)
        .order("sort_order");
      weightTier = tiers?.find((t) => t.grams === oi.weight_grams_ordered) ?? tiers?.[0] ?? null;
    }

    cartItems.push({
      cart_line_id: crypto.randomUUID(),
      menu_item_id: oi.menu_item_id,
      name_en: menuItem.name_en,
      name_ar: menuItem.name_ar,
      image_asset_key: menuItem.image_asset_key,
      quantity: oi.quantity,
      base_unit_price: menuItem.base_price,
      weight_tier: weightTier,
      doneness: oi.doneness,
      notes: oi.notes,
      modifiers: (modifierRows ?? [])
        .filter((m) => m.order_item_id === oi.id)
        .map((m) => ({
          id: m.modifier_id ?? crypto.randomUUID(),
          name_en: m.name_snapshot,
          name_ar: m.name_snapshot,
          price_delta: m.price_delta_snapshot,
        })),
      combo_selections: (componentRows ?? [])
        .filter((c) => c.order_item_id === oi.id)
        .map((c) => {
          const componentMenuItem = c.menu_items as unknown as { name_en: string; name_ar: string } | null;
          return {
            combo_component_id: c.combo_component_id ?? "",
            slot_label: c.slot_label,
            component_menu_item_id: c.component_menu_item_id,
            component_name_en: componentMenuItem?.name_en ?? "",
            component_name_ar: componentMenuItem?.name_ar ?? "",
            upcharge: c.upcharge_snapshot,
          };
        }),
    });
  }

  return cartItems;
}
