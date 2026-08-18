import type { OrderChannel, OrderStatus } from "@bbq/types";

export interface OrderStep {
  status: OrderStatus;
  labelKey: string;
}

const DINE_IN: OrderStep[] = [
  { status: "placed", labelKey: "placed" },
  { status: "confirmed", labelKey: "confirmed" },
  { status: "grilling", labelKey: "grilling" },
  { status: "plating", labelKey: "plating_dine_in" },
  { status: "ready", labelKey: "ready_dine_in" },
  { status: "served", labelKey: "served" },
];

const PICKUP: OrderStep[] = [
  { status: "placed", labelKey: "placed" },
  { status: "confirmed", labelKey: "confirmed" },
  { status: "grilling", labelKey: "grilling" },
  { status: "plating", labelKey: "plating_pickup" },
  { status: "ready", labelKey: "ready_pickup" },
  { status: "completed", labelKey: "completed" },
];

const DELIVERY: OrderStep[] = [
  { status: "placed", labelKey: "placed" },
  { status: "confirmed", labelKey: "confirmed" },
  { status: "grilling", labelKey: "grilling" },
  { status: "plating", labelKey: "plating_delivery" },
  { status: "ready", labelKey: "ready_delivery" },
  { status: "out_for_delivery", labelKey: "out_for_delivery" },
  { status: "delivered", labelKey: "delivered" },
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
