"use client";

import { useMemo, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { CheckoutPayloadSchema } from "@bbq/types";
import { useCartStore, type OrderMode } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import { cartSubtotal, estimateTax, toCheckoutItems } from "@/lib/pricing";
import { DELIVERY_FEE, MIN_PRE_ORDER_LEAD_MINUTES, RESTAURANT_CLOSE_HOUR, RESTAURANT_OPEN_HOUR, TIME_SLOT_INTERVAL_MINUTES } from "@/lib/constants";
import { getPaymentAdapter, type PaymentMethod } from "@/lib/payments/adapter";
import { useFeatureFlags } from "@/lib/use-feature-flags";
import { useRouter } from "@/i18n/navigation";

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = RESTAURANT_OPEN_HOUR; h < RESTAURANT_CLOSE_HOUR; h++) {
    for (let m = 0; m < 60; m += TIME_SLOT_INTERVAL_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const tPricing = useTranslations("pricing");
  const tCommon = useTranslations("common");
  const tCart = useTranslations("cart");
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const items = useCartStore((s) => s.items);
  const orderMode = useCartStore((s) => s.orderMode);
  const setOrderMode = useCartStore((s) => s.setOrderMode);
  const tableId = useCartStore((s) => s.tableId);
  const tableLabel = useCartStore((s) => s.tableLabel);
  const clearCart = useCartStore((s) => s.clear);

  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isPlacing, setIsPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDineIn = orderMode === "qr_table" && !!tableId;
  const timeSlots = useMemo(buildTimeSlots, []);

  const subtotal = cartSubtotal(items);
  const tax = estimateTax(subtotal);
  const deliveryFee = orderMode === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + tax + deliveryFee;

  function captureLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function friendlyRpcError(message?: string): string {
    if (!message) return t("errorGeneric");
    if (message.includes("OUT_OF_STOCK")) return t("errorOutOfStock");
    if (message.includes("ITEM_UNAVAILABLE")) return t("errorItemUnavailable");
    if (message.includes("TABLE_REQUIRED")) return t("errorTableRequired");
    return t("errorGeneric");
  }

  async function placeOrder() {
    setError(null);

    const scheduledFor =
      orderMode === "pre_order" && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
        : null;

    const payload = CheckoutPayloadSchema.safeParse({
      channel: orderMode,
      table_id: isDineIn ? tableId : null,
      scheduled_for: scheduledFor,
      delivery_address: orderMode === "delivery" ? address : null,
      delivery_lat: coords?.lat ?? null,
      delivery_lng: coords?.lng ?? null,
      delivery_notes: null,
      items: toCheckoutItems(items),
    });

    if (!payload.success) {
      setError(payload.error.issues[0]?.message ?? t("errorValidation"));
      return;
    }

    setIsPlacing(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("place_order", {
      p_channel: payload.data.channel,
      p_table_id: payload.data.table_id ?? null,
      p_scheduled_for: payload.data.scheduled_for ?? null,
      p_delivery_address: payload.data.delivery_address ?? null,
      p_delivery_lat: payload.data.delivery_lat ?? null,
      p_delivery_lng: payload.data.delivery_lng ?? null,
      p_delivery_notes: payload.data.delivery_notes ?? null,
      p_items: payload.data.items,
    });

    if (rpcError || !data?.[0]) {
      setIsPlacing(false);
      setError(friendlyRpcError(rpcError?.message));
      return;
    }

    const orderId = data[0].order_id;

    if (!isDineIn) {
      await getPaymentAdapter().charge({ amount: total, currency: "SAR", method: paymentMethod, orderId });
    }

    clearCart();
    setIsPlacing(false);
    router.push(`/orders/${orderId}`);
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-charcoal-100">{tCart("empty")}</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            {t("browseMenu")}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 pb-32">
      <h1 className="text-2xl font-semibold text-white mb-6">{t("title")}</h1>

      {isDineIn ? (
        <div className="glass-panel p-4 mb-6">
          <p className="text-white font-medium">{t("dineInTable", { label: tableLabel ?? "" })}</p>
          <p className="text-sm text-smoke-400">{t("dineInLocked")}</p>
        </div>
      ) : (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">{t("orderType")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { mode: "pickup" as OrderMode, label: t("pickup") },
                { mode: "delivery" as OrderMode, label: t("delivery") },
                ...(flags.pre_orders ? [{ mode: "pre_order" as OrderMode, label: t("preOrder") }] : []),
              ]
            ).map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setOrderMode(opt.mode)}
                className={`rounded-xl2 border px-3 py-2.5 text-sm transition-colors ${
                  orderMode === opt.mode ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {orderMode === "delivery" && !isDineIn && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">{t("deliveryAddress")}</h2>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t("addressPlaceholder")}
            rows={2}
            className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-smoke-500 focus:border-ember-500 focus:outline-none"
          />
          <button
            onClick={captureLocation}
            disabled={locating}
            className="mt-2 flex items-center gap-1.5 text-sm text-ember-400"
          >
            {locating ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
            {coords ? t("locationCaptured") : t("useCurrentLocation")}
          </button>
        </section>
      )}

      {orderMode === "pre_order" && !isDineIn && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">{t("schedule")}</h2>
          <div className="flex gap-2">
            <input
              type="date"
              value={scheduledDate}
              min={new Date(Date.now() + MIN_PRE_ORDER_LEAD_MINUTES * 60000).toISOString().slice(0, 10)}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white focus:border-ember-500 focus:outline-none"
            />
            <select
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white focus:border-ember-500 focus:outline-none"
            >
              <option value="">{t("time")}</option>
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {!isDineIn && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">{t("payment")}</h2>
          <div className="space-y-2">
            {(
              [
                { method: "card" as PaymentMethod, label: t("cardPayment") },
                { method: "apple_pay" as PaymentMethod, label: t("applePay") },
                { method: "cash_on_delivery" as PaymentMethod, label: t("cashOnDelivery") },
              ]
            ).map((opt) => (
              <button
                key={opt.method}
                onClick={() => setPaymentMethod(opt.method)}
                className={`w-full text-start rounded-xl2 border px-4 py-2.5 text-sm transition-colors ${
                  paymentMethod === opt.method ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="glass-panel p-4 space-y-1.5 mb-6">
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>{tPricing("subtotal")}</span>
          <span>
            {subtotal.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>{tPricing("vat")}</span>
          <span>
            {tax.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        {orderMode === "delivery" && (
          <div className="flex justify-between text-sm text-charcoal-100">
            <span>{tPricing("deliveryFee")}</span>
            <span>
              {deliveryFee.toFixed(2)} {tCommon("sar")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-white pt-1.5 border-t border-white/5">
          <span>{tPricing("total")}</span>
          <span>
            {total.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
      </section>

      {error && <p className="text-sm text-red-400 mb-4">{error}</p>}

      <Button variant="primary" size="lg" className="w-full" disabled={isPlacing} onClick={placeOrder}>
        {isPlacing ? t("placingOrder") : t("placeOrder", { total: total.toFixed(2) })}
      </Button>
    </main>
  );
}
