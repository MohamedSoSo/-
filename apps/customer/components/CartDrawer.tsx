"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { localizedField, type Locale } from "@bbq/i18n";
import { useCartStore } from "@/lib/cart-store";
import { cartSubtotal, estimateTax, lineTotalOf, unitPriceOf } from "@/lib/pricing";
import { DELIVERY_FEE } from "@/lib/constants";
import { useRouter } from "@/i18n/navigation";

export function CartDrawer() {
  const locale = useLocale() as Locale;
  const isRtl = locale === "ar";
  const t = useTranslations("cart");
  const tPricing = useTranslations("pricing");
  const tDoneness = useTranslations("doneness");
  const tCommon = useTranslations("common");
  const listSeparator = isRtl ? "، " : ", ";
  const router = useRouter();
  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const orderMode = useCartStore((s) => s.orderMode);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const titleId = useId();

  const subtotal = cartSubtotal(items);
  const tax = estimateTax(subtotal);
  const deliveryFee = orderMode === "delivery" ? DELIVERY_FEE : 0;
  const total = subtotal + tax + deliveryFee;
  const offscreenX = isRtl ? "-100%" : "100%";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`fixed end-0 top-0 z-50 h-full w-full max-w-md bg-charcoal-900 border-s border-white/10 flex flex-col`}
            initial={{ x: offscreenX }}
            animate={{ x: 0 }}
            exit={{ x: offscreenX }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 id={titleId} className="text-lg font-semibold text-white">{t("title")}</h2>
              <button onClick={close} className="p-1 text-smoke-400 hover:text-white" aria-label={t("close")}>
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.length === 0 && <p className="text-smoke-400 text-sm">{t("empty")}</p>}
              {items.map((item) => (
                <div key={item.cart_line_id} className="rounded-xl2 border border-white/5 p-3">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{localizedField(item.name_en, item.name_ar, locale)}</p>
                      {item.weight_tier && <p className="text-xs text-smoke-400">{item.weight_tier.label}</p>}
                      {item.doneness && <p className="text-xs text-smoke-400">{tDoneness(item.doneness)}</p>}
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-smoke-400">
                          {item.modifiers.map((m) => localizedField(m.name_en, m.name_ar, locale)).join(listSeparator)}
                        </p>
                      )}
                      {item.combo_selections.length > 0 && (
                        <p className="text-xs text-smoke-400">
                          {item.combo_selections
                            .map((c) => localizedField(c.component_name_en, c.component_name_ar, locale))
                            .join(listSeparator)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.cart_line_id)}
                      className="text-smoke-400 hover:text-red-400 h-fit"
                      aria-label={t("removeItem")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1">
                      <button
                        onClick={() => updateQuantity(item.cart_line_id, item.quantity - 1)}
                        aria-label={tCommon("decreaseQuantity")}
                      >
                        <Minus size={14} className="text-smoke-400" />
                      </button>
                      <span className="text-sm text-white w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cart_line_id, item.quantity + 1)}
                        aria-label={tCommon("increaseQuantity")}
                      >
                        <Plus size={14} className="text-smoke-400" />
                      </button>
                    </div>
                    <p className="text-ember-400 font-medium">
                      {lineTotalOf(item).toFixed(2)} {tCommon("sar")}
                      {item.quantity > 1 && (
                        <span className="text-smoke-400 font-normal">
                          {" "}
                          {t("eachPrice", { price: unitPriceOf(item).toFixed(2) })}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {items.length > 0 && (
              <div className="border-t border-white/10 px-5 py-4 space-y-1.5">
                <div className="flex justify-between text-sm text-charcoal-100">
                  <span>{tPricing("subtotal")}</span>
                  <span>{subtotal.toFixed(2)} {tCommon("sar")}</span>
                </div>
                <div className="flex justify-between text-sm text-charcoal-100">
                  <span>{tPricing("vat")}</span>
                  <span>{tax.toFixed(2)} {tCommon("sar")}</span>
                </div>
                {orderMode === "delivery" && (
                  <div className="flex justify-between text-sm text-charcoal-100">
                    <span>{tPricing("deliveryFee")}</span>
                    <span>{deliveryFee.toFixed(2)} {tCommon("sar")}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-white pt-1.5 border-t border-white/5">
                  <span>{tPricing("total")}</span>
                  <span>{total.toFixed(2)} {tCommon("sar")}</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-3"
                  onClick={() => {
                    close();
                    router.push("/checkout");
                  }}
                >
                  {t("checkout")}
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
