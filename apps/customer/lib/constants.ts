// KSA standard VAT rate — must match the constant baked into place_order()
// (supabase/migrations/0012_place_order.sql). The server total is always
// authoritative; this is only for the client-side cart preview.
export const VAT_RATE = 0.15;

export const RESTAURANT_OPEN_HOUR = 12; // 12:00
export const RESTAURANT_CLOSE_HOUR = 23; // 23:00
export const TIME_SLOT_INTERVAL_MINUTES = 30;
export const MIN_PRE_ORDER_LEAD_MINUTES = 60;

export const DEFAULT_COUNTRY_CODE = "+966";

export const DELIVERY_FEE = 15;
