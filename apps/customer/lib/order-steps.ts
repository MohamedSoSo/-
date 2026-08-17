import type { OrderChannel, OrderStatus } from "@bbq/types";

export interface OrderStep {
  status: OrderStatus;
  label: string;
}

const DINE_IN: OrderStep[] = [
  { status: "placed", label: "Order received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "grilling", label: "On the grill" },
  { status: "plating", label: "Plating" },
  { status: "ready", label: "Ready" },
  { status: "served", label: "Served" },
];

const PICKUP: OrderStep[] = [
  { status: "placed", label: "Order received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "grilling", label: "On the grill" },
  { status: "plating", label: "Plating" },
  { status: "ready", label: "Ready for pickup" },
  { status: "completed", label: "Picked up" },
];

const DELIVERY: OrderStep[] = [
  { status: "placed", label: "Order received" },
  { status: "confirmed", label: "Confirmed" },
  { status: "grilling", label: "On the grill" },
  { status: "plating", label: "Packaging" },
  { status: "ready", label: "Ready" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "delivered", label: "Delivered" },
];

export function stepsForChannel(channel: OrderChannel): OrderStep[] {
  if (channel === "qr_table") return DINE_IN;
  if (channel === "delivery") return DELIVERY;
  return PICKUP; // pickup + pre_order share the same visual progression
}

// kitchen_prep is a same-stage alias of grilling for the customer-facing
// tracker — the grill/kitchen split only matters to the KDS (Phase 3).
export function currentStepIndex(channel: OrderChannel, status: OrderStatus): number {
  const steps = stepsForChannel(channel);
  const normalized = status === "kitchen_prep" ? "grilling" : status;
  const idx = steps.findIndex((s) => s.status === normalized);
  return idx === -1 ? 0 : idx;
}

export function isTerminalFailure(status: OrderStatus): boolean {
  return status === "cancelled" || status === "voided";
}
