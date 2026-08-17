import { z } from "zod";

export const RoleSchema = z.enum([
  "customer",
  "cashier",
  "grill_chef",
  "kitchen_chef",
  "waiter",
  "driver",
  "owner",
  "developer",
]);
export type Role = z.infer<typeof RoleSchema>;

export const WeightUnitSchema = z.enum(["g", "kg"]);
export type WeightUnit = z.infer<typeof WeightUnitSchema>;

export const DonenessLevelSchema = z.enum([
  "rare",
  "medium_rare",
  "medium",
  "medium_well",
  "well_done",
]);
export type DonenessLevel = z.infer<typeof DonenessLevelSchema>;

export const OrderChannelSchema = z.enum([
  "qr_table",
  "delivery",
  "pickup",
  "pre_order",
]);
export type OrderChannel = z.infer<typeof OrderChannelSchema>;

export const OrderStatusSchema = z.enum([
  "placed",
  "confirmed",
  "grilling",
  "kitchen_prep",
  "plating",
  "ready",
  "served",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "voided",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const StationSchema = z.enum(["grill", "kitchen", "bar", "dessert"]);
export type Station = z.infer<typeof StationSchema>;

export const ModifierSelectionTypeSchema = z.enum(["single", "multiple"]);
export type ModifierSelectionType = z.infer<typeof ModifierSelectionTypeSchema>;

export const MenuItemTypeSchema = z.enum(["single", "combo"]);
export type MenuItemType = z.infer<typeof MenuItemTypeSchema>;

export const AuditActionSchema = z.enum([
  "price_update",
  "void_transaction",
  "discount_applied",
  "refund_issued",
  "elevated_auth",
  "menu_item_update",
  "feature_flag_toggle",
  "asset_update",
  "user_role_change",
  "table_transfer",
  "order_merge",
  "no_sale_drawer_open",
  "shift_close",
  "inventory_waste",
]);
export type AuditAction = z.infer<typeof AuditActionSchema>;

export const TableStatusSchema = z.enum(["free", "occupied", "reserved", "needs_cleaning"]);
export type TableStatus = z.infer<typeof TableStatusSchema>;

export const PaymentMethodSchema = z.enum(["card", "apple_pay", "cash", "terminal"]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const ShiftStatusSchema = z.enum(["open", "closed"]);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const WasteReasonSchema = z.enum(["voided_after_cook", "dropped", "quality_reject", "expired", "other"]);
export type WasteReason = z.infer<typeof WasteReasonSchema>;

export const ZatcaSignatureStatusSchema = z.enum(["unsigned", "signed_stub", "signed"]);
export type ZatcaSignatureStatus = z.infer<typeof ZatcaSignatureStatusSchema>;
