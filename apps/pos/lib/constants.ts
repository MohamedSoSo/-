export const VAT_RATE = 0.15; // must match place_order()/void_order_item()'s hardcoded rate

// KDS SLA thresholds, minutes since the item entered its current station.
export const SLA_YELLOW_MINUTES = 6;
export const SLA_RED_MINUTES = 12;

export const KDS_POLL_FALLBACK_MS = 20000; // belt-and-suspenders re-fetch if a realtime event is missed
