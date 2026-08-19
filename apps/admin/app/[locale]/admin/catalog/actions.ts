"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// RLS (categories_management_write / menu_items_management_write, both
// gated on is_management()) is the real authorization boundary — these Zod
// parses are input hygiene, not the security control. The middleware gate
// on /admin/catalog (is_management()) is defense-in-depth on top of that.

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  sort_order: z.number().int().default(0),
});

export async function upsertCategory(input: z.infer<typeof CategoryInput>) {
  const parsed = CategoryInput.parse(input);
  const supabase = createClient();
  const { error } = await supabase.from("categories").upsert(parsed);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/catalog");
}

export async function setCategoryDeleted(id: string, deleted: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("categories")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/catalog");
}

const WeightTierInput = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(40),
  grams: z.number().int().positive(),
  price_multiplier: z.number().positive(),
  sort_order: z.number().int().default(0),
});

const MenuItemInput = z.object({
  id: z.string().uuid().optional(),
  name_en: z.string().min(1).max(120),
  name_ar: z.string().min(1).max(120),
  description_en: z.string().max(1000).nullable(),
  description_ar: z.string().max(1000).nullable(),
  category_id: z.string().uuid(),
  base_price: z.number().nonnegative(),
  is_weight_based: z.boolean(),
  default_weight_unit: z.enum(["g", "kg"]),
  supports_doneness: z.boolean(),
  available_doneness_levels: z.array(
    z.enum(["rare", "medium_rare", "medium", "medium_well", "well_done"])
  ),
  default_station: z.enum(["grill", "kitchen", "bar", "dessert"]),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  weight_tiers: z.array(WeightTierInput),
});

export async function upsertMenuItem(input: z.infer<typeof MenuItemInput>) {
  const { weight_tiers, ...item } = MenuItemInput.parse(input);
  const supabase = createClient();

  const { data: savedItem, error } = await supabase
    .from("menu_items")
    .upsert(item)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const itemId = savedItem.id;

  // Simple replace-all for tiers — acceptable for an admin CRUD tool; past
  // orders snapshot weight_grams_ordered at order time, so they don't hold
  // a live reference to weight_tiers rows that this could dangle.
  const { error: deleteError } = await supabase.from("weight_tiers").delete().eq("menu_item_id", itemId);
  if (deleteError) throw new Error(deleteError.message);

  if (weight_tiers.length > 0) {
    const { error: insertError } = await supabase
      .from("weight_tiers")
      .insert(weight_tiers.map(({ id: _id, ...tier }) => ({ ...tier, menu_item_id: itemId })));
    if (insertError) throw new Error(insertError.message);
  }

  revalidatePath("/admin/catalog");
  return itemId;
}

export async function setMenuItemDeleted(id: string, deleted: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/catalog");
}

export async function updateMenuItemImage(id: string, imagePath: string | null) {
  const supabase = createClient();
  const { error } = await supabase.from("menu_items").update({ image_path: imagePath }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/catalog");
}
