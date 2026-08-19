import { z } from "zod";
import {
  WeightUnitSchema,
  DonenessLevelSchema,
  MenuItemTypeSchema,
  ModifierSelectionTypeSchema,
  StationSchema,
} from "./enums";

export const WeightTierSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(40), // e.g. "250g", "500g", "1kg"
  grams: z.number().int().positive(),
  price_multiplier: z.number().positive().default(1),
});
export type WeightTier = z.infer<typeof WeightTierSchema>;

export const MenuItemSchema = z.object({
  id: z.string().uuid(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  description_en: z.string().max(1000).nullable(),
  description_ar: z.string().max(1000).nullable(),
  category_id: z.string().uuid(),
  base_price: z.number().nonnegative(),
  is_weight_based: z.boolean().default(false),
  default_weight_unit: WeightUnitSchema.default("g"),
  supports_doneness: z.boolean().default(false),
  available_doneness_levels: z.array(DonenessLevelSchema).default([]),
  cogs: z.number().nonnegative(), // cost of goods sold, feeds Owner BI
  image_path: z.string().nullable(), // object path in the catalog-images Storage bucket
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  item_type: MenuItemTypeSchema.default("single"),
  default_station: StationSchema,
  stock_quantity: z.number().int().nonnegative().nullable(), // null = unmetered
  stock_version: z.number().int().nonnegative().default(0),
  deleted_at: z.string().datetime().nullable(), // soft delete
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const ModifierSchema = z.object({
  id: z.string().uuid(),
  group_id: z.string().uuid(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  price_delta: z.number(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const ModifierGroupSchema = z.object({
  id: z.string().uuid(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  selection_type: ModifierSelectionTypeSchema,
  is_required: z.boolean().default(false),
  min_select: z.number().int().nonnegative(),
  max_select: z.number().int().positive(),
  modifiers: z.array(ModifierSchema).default([]),
});
export type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

export const ComboComponentSchema = z.object({
  id: z.string().uuid(),
  combo_menu_item_id: z.string().uuid(),
  slot_label: z.string().min(1).max(120),
  category_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  upcharge: z.number().nonnegative(),
  sort_order: z.number().int().default(0),
});
export type ComboComponent = z.infer<typeof ComboComponentSchema>;

export const CartLineItemSchema = z.object({
  cart_line_id: z.string(), // client-generated, keys the line within the cart only
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  weight_tier_id: z.string().uuid().nullable(),
  doneness: DonenessLevelSchema.nullable(),
  notes: z.string().max(280).nullable(),
  modifier_ids: z.array(z.string().uuid()).default([]),
  combo_selections: z
    .array(
      z.object({
        combo_component_id: z.string().uuid(),
        component_menu_item_id: z.string().uuid(),
      })
    )
    .default([]),
});
export type CartLineItem = z.infer<typeof CartLineItemSchema>;
