import type { IngredientInfo, MenuItemIngredientUsage, RawOrderItem } from "../bi-data";

/**
 * Dynamic COGS: if a menu item has raw-ingredient links (menu_item_ingredients),
 * cost = sum(kg_per_unit * ingredient.unit_cost_per_kg) — so editing a supplier
 * price in the COGS panel changes this instantly for every order that used it,
 * past and future. kg_per_unit is a flat "raw kg typically consumed per order
 * of this item" figure (not scaled per weight-tier) — a deliberate
 * simplification; a fully accurate model would scale by the actual tier
 * ordered, which needs the item's weight_tiers on hand at compute time.
 *
 * Items with no ingredient link (starters, drinks, combos) fall back to
 * menu_items.cogs, the flat figure from Phase 1.
 */
export function computeCogs(
  item: Pick<RawOrderItem, "menu_item_id" | "base_cogs">,
  ingredientUsage: MenuItemIngredientUsage[],
  ingredients: IngredientInfo[]
): number {
  const links = ingredientUsage.filter((u) => u.menu_item_id === item.menu_item_id);
  if (links.length === 0) return item.base_cogs;

  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  let cost = 0;
  for (const link of links) {
    const ingredient = ingredientById.get(link.ingredient_id);
    if (!ingredient) continue;
    cost += link.kg_per_unit * ingredient.unit_cost_per_kg;
  }
  return Math.round(cost * 100) / 100;
}
