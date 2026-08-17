import { z } from "zod";
import {
  OrderChannelSchema,
  OrderStatusSchema,
  DonenessLevelSchema,
  StationSchema,
} from "./enums";

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  order_id: z.string().uuid(),
  menu_item_id: z.string().uuid(),
  station: StationSchema,
  quantity: z.number().int().positive(),
  weight_grams_ordered: z.number().int().positive().nullable(),
  weight_grams_actual: z.number().int().positive().nullable(), // post-grill scale reading, feeds yield/loss tracking
  doneness: DonenessLevelSchema.nullable(),
  unit_price: z.number().nonnegative(),
  line_total: z.number().nonnegative(),
  notes: z.string().max(280).nullable(),
  status: OrderStatusSchema,
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  channel: OrderChannelSchema,
  status: OrderStatusSchema,
  table_id: z.string().uuid().nullable(),
  customer_id: z.string().uuid().nullable(),
  driver_id: z.string().uuid().nullable(),
  subtotal: z.number().nonnegative(),
  discount_total: z.number().nonnegative().default(0),
  tax_total: z.number().nonnegative().default(0), // ZATCA VAT
  grand_total: z.number().nonnegative(),
  zatca_invoice_uuid: z.string().uuid().nullable(),
  zatca_qr_payload: z.string().nullable(),
  scheduled_for: z.string().datetime().nullable(), // pre-orders
  placed_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(), // soft delete
});
export type Order = z.infer<typeof OrderSchema>;
