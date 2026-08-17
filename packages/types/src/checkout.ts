import { z } from "zod";
import { OrderChannelSchema, DonenessLevelSchema } from "./enums";

// Mirrors the JSON shape place_order() (supabase/migrations/0012_place_order.sql)
// expects in its p_items argument. Validated client-side before the RPC call;
// the RPC re-validates everything server-side since it's the real trust boundary.
export const CheckoutItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive().max(50),
  weight_tier_id: z.string().uuid().nullable().optional(),
  doneness: DonenessLevelSchema.nullable().optional(),
  notes: z.string().max(280).nullable().optional(),
  modifier_ids: z.array(z.string().uuid()).max(20).optional(),
  combo_selections: z
    .array(
      z.object({
        combo_component_id: z.string().uuid(),
        component_menu_item_id: z.string().uuid(),
      })
    )
    .max(10)
    .optional(),
});
export type CheckoutItem = z.infer<typeof CheckoutItemSchema>;

export const CheckoutPayloadSchema = z
  .object({
    channel: OrderChannelSchema,
    table_id: z.string().uuid().nullable().optional(),
    scheduled_for: z.string().datetime().nullable().optional(),
    delivery_address: z.string().max(500).nullable().optional(),
    delivery_lat: z.number().min(-90).max(90).nullable().optional(),
    delivery_lng: z.number().min(-180).max(180).nullable().optional(),
    delivery_notes: z.string().max(500).nullable().optional(),
    items: z.array(CheckoutItemSchema).min(1).max(50),
  })
  .refine((v) => v.channel !== "qr_table" || !!v.table_id, {
    message: "table_id is required for dine-in orders",
    path: ["table_id"],
  })
  .refine((v) => v.channel !== "delivery" || !!v.delivery_address, {
    message: "delivery_address is required for delivery orders",
    path: ["delivery_address"],
  });
export type CheckoutPayload = z.infer<typeof CheckoutPayloadSchema>;
