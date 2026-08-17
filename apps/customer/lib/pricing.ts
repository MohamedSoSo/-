import type { CartItem } from "./cart-store";
import type { CheckoutItem } from "@bbq/types";
import { VAT_RATE } from "./constants";

export function unitPriceOf(item: CartItem): number {
  const base = item.weight_tier ? item.base_unit_price * item.weight_tier.price_multiplier : item.base_unit_price;
  const modifiersTotal = item.modifiers.reduce((sum, m) => sum + m.price_delta, 0);
  const comboTotal = item.combo_selections.reduce((sum, c) => sum + c.upcharge, 0);
  return round2(base + modifiersTotal + comboTotal);
}

export function lineTotalOf(item: CartItem): number {
  return round2(unitPriceOf(item) * item.quantity);
}

export function cartSubtotal(items: CartItem[]): number {
  return round2(items.reduce((sum, item) => sum + lineTotalOf(item), 0));
}

export function estimateTax(subtotal: number): number {
  return round2(subtotal * VAT_RATE);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toCheckoutItems(items: CartItem[]): CheckoutItem[] {
  return items.map((item) => ({
    menu_item_id: item.menu_item_id,
    quantity: item.quantity,
    weight_tier_id: item.weight_tier?.id ?? null,
    doneness: item.doneness,
    notes: item.notes,
    modifier_ids: item.modifiers.map((m) => m.id),
    combo_selections: item.combo_selections.map((c) => ({
      combo_component_id: c.combo_component_id,
      component_menu_item_id: c.component_menu_item_id,
    })),
  }));
}
