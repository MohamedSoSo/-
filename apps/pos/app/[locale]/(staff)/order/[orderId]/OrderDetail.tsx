"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowRightLeft, Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import type { OrderStatus, PaymentMethod, ZatcaSignatureStatus } from "@bbq/types";
import { localizedField, type Locale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/client";
import { usePosSession } from "@/lib/pos-session";
import { SupervisorPinModal } from "@/components/SupervisorPinModal";
import { printReceipt } from "@/lib/printing/adapter";
import { finalizeZatcaInvoice } from "@/lib/zatca/finalize";
import { VAT_RATE } from "@/lib/constants";

interface OrderRow {
  id: string;
  order_number: string;
  channel: string;
  status: OrderStatus;
  table_id: string | null;
  subtotal: number;
  tax_total: number;
  discount_total: number;
  grand_total: number;
  zatca_qr_payload: string | null;
  zatca_signature_status: ZatcaSignatureStatus;
  zatca_signed_at: string | null;
  placed_at: string;
  restaurant_tables: { label: string } | { label: string }[] | null;
}

interface ItemRow {
  id: string;
  menu_item_id: string;
  quantity: number;
  weight_grams_ordered: number | null;
  weight_grams_actual: number | null;
  doneness: string | null;
  unit_price: number;
  line_total: number;
  status: OrderStatus;
  station: string;
  menu_items: { name_en: string; name_ar: string } | { name_en: string; name_ar: string }[] | null;
}

interface PaymentRow {
  id: string;
  method: PaymentMethod;
  amount: number;
  is_refund: boolean;
  created_at: string;
}

function firstOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function OrderDetail({
  initialOrder,
  initialItems,
  initialPayments,
  tables,
}: {
  initialOrder: OrderRow;
  initialItems: ItemRow[];
  initialPayments: PaymentRow[];
  tables: { id: string; label: string }[];
}) {
  const locale = useLocale() as Locale;
  const t = useTranslations("orderDetail");
  const tCommon = useTranslations("common");
  const tDoneness = useTranslations("doneness");
  const router = useRouter();
  const operator = usePosSession((s) => s.operator);
  const activeShiftId = usePosSession((s) => s.activeShiftId);

  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState(initialItems);
  const [payments, setPayments] = useState(initialPayments);
  const [pendingVoidItemId, setPendingVoidItemId] = useState<string | null>(null);
  const [pendingDiscount, setPendingDiscount] = useState<{ amount: number; reason: string } | null>(null);
  const [discountDraft, setDiscountDraft] = useState({ amount: "", reason: "" });
  const [paymentDraft, setPaymentDraft] = useState<{ method: PaymentMethod; amount: string }>({
    method: "cash",
    amount: "",
  });
  const [isPrinting, setIsPrinting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order_detail_${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        setOrder((prev) => ({ ...prev, ...(payload.new as Partial<OrderRow>) }));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `order_id=eq.${order.id}` }, () => {
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [order.id, router]);

  const tableLabel = firstOf(order.restaurant_tables)?.label ?? null;
  const paidTotal = payments.filter((p) => !p.is_refund).reduce((s, p) => s + p.amount, 0);
  const balanceDue = Math.max(order.grand_total - paidTotal, 0);

  async function handleVoid(pin: string) {
    if (!pendingVoidItemId) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("void_order_item", {
      p_order_item_id: pendingVoidItemId,
      p_reason: "Voided at POS",
      p_supervisor_pin: pin,
    });
    if (error) throw error;
    router.refresh();
  }

  async function handleDiscount(pin: string) {
    if (!pendingDiscount) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("apply_discount", {
      p_order_id: order.id,
      p_discount_amount: pendingDiscount.amount,
      p_reason: pendingDiscount.reason,
      p_supervisor_pin: pin,
    });
    if (error) throw error;
    router.refresh();
  }

  async function recordPayment() {
    const amount = parseFloat(paymentDraft.amount);
    if (!amount || amount <= 0) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("record_payment", {
      p_order_id: order.id,
      p_method: paymentDraft.method,
      p_amount: amount,
      p_shift_id: activeShiftId,
      p_reference: null,
    });
    if (error) {
      setNotice(error.message);
      return;
    }
    setPaymentDraft({ method: "cash", amount: "" });
    router.refresh();
  }

  async function transferTable(newTableId: string) {
    const supabase = createClient();
    await supabase.rpc("transfer_table", { p_order_id: order.id, p_new_table_id: newTableId });
    router.refresh();
  }

  async function finalizeAndPrint() {
    setIsPrinting(true);
    setNotice(null);
    try {
      let qrPayload = order.zatca_qr_payload;

      if (!order.zatca_signed_at) {
        const result = await finalizeZatcaInvoice({
          invoiceUuid: crypto.randomUUID(),
          orderNumber: order.order_number,
          issuedAt: new Date().toISOString(),
          sellerName: "Smart BBQ",
          sellerVatNumber: "300000000000003",
          lines: items
            .filter((i) => i.status !== "voided")
            .map((i) => ({
              name: firstOf(i.menu_items)?.name_en ?? t("unknownItem"),
              quantity: i.quantity,
              unitPrice: i.unit_price,
              lineTotal: i.line_total,
            })),
          subtotal: order.subtotal,
          taxTotal: order.tax_total,
          discountTotal: order.discount_total,
          grandTotal: order.grand_total,
        });

        const supabase = createClient();
        const { error } = await supabase
          .from("orders")
          .update({
            zatca_qr_payload: result.qrPayload,
            zatca_xml: result.xml,
            zatca_signature_status: result.signatureStatus,
            zatca_signed_at: new Date().toISOString(),
          })
          .eq("id", order.id);
        if (error) throw error;

        qrPayload = result.qrPayload;
        setOrder((prev) => ({ ...prev, zatca_qr_payload: result.qrPayload, zatca_signature_status: result.signatureStatus }));
      }

      const printResult = await printReceipt({
        orderNumber: order.order_number,
        lines: items
          .filter((i) => i.status !== "voided")
          .map((i) => {
            const menuItem = firstOf(i.menu_items);
            return {
              label: menuItem ? localizedField(menuItem.name_en, menuItem.name_ar, locale) : t("unknownItem"),
              qty: i.quantity,
              amount: i.line_total,
            };
          }),
        subtotal: order.subtotal,
        taxTotal: order.tax_total,
        discountTotal: order.discount_total,
        grandTotal: order.grand_total,
        zatcaQrPayload: qrPayload,
        operatorName: operator?.displayName ?? "Staff",
        placedAt: order.placed_at,
      });

      if (printResult.usedRole === "browser_fallback") {
        setNotice(t("printedViaBrowser", { error: printResult.error ?? "" }));
      } else if (printResult.usedRole === "secondary") {
        setNotice(t("printedViaSecondary"));
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("printFailed"));
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{order.order_number}</h1>
          <p className="text-sm text-smoke-400">
            {t(`channel.${order.channel}`)} {tableLabel && `· ${t("table", { label: tableLabel })}`} · {t(`status.${order.status}`)}
          </p>
        </div>
        {order.zatca_signature_status === "signed_stub" && (
          <span className="text-[10px] rounded-full bg-yellow-500/20 text-yellow-300 px-2 py-1">{t("zatcaUnsigned")}</span>
        )}
      </div>

      <div className="space-y-2 mb-6">
        {items.map((item) => {
          const menuItem = firstOf(item.menu_items);
          const name = menuItem ? localizedField(menuItem.name_en, menuItem.name_ar, locale) : t("unknownItem");
          return (
            <div
              key={item.id}
              className={`glass-panel p-3 flex items-center justify-between ${item.status === "voided" ? "opacity-40" : ""}`}
            >
              <div>
                <p className="text-white text-sm">
                  {item.quantity}× {name}
                </p>
                <p className="text-xs text-smoke-400">
                  {item.station} · {t(`status.${item.status}`)}
                  {item.weight_grams_ordered && ` · ${item.weight_grams_ordered}g`}
                  {item.doneness && ` · ${tDoneness(item.doneness)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-ember-400 text-sm">
                  {item.line_total.toFixed(2)} {tCommon("sar")}
                </span>
                {item.status !== "voided" && (
                  <button
                    onClick={() => setPendingVoidItemId(item.id)}
                    className="text-xs text-red-400 border border-red-500/30 rounded-full px-2 py-1"
                  >
                    {t("void")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel p-4 mb-6 space-y-1.5">
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>{t("subtotal")}</span>
          <span>
            {order.subtotal.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>{t("vat", { rate: Math.round(VAT_RATE * 100) })}</span>
          <span>
            {order.tax_total.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        {order.discount_total > 0 && (
          <div className="flex justify-between text-sm text-charcoal-100">
            <span>{t("discount")}</span>
            <span>
              -{order.discount_total.toFixed(2)} {tCommon("sar")}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-white pt-1.5 border-t border-white/5">
          <span>{t("total")}</span>
          <span>
            {order.grand_total.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        <div className="flex justify-between text-sm text-emerald-400">
          <span>{t("paid")}</span>
          <span>
            {paidTotal.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
        <div className="flex justify-between text-sm text-ember-400 font-medium">
          <span>{t("balanceDue")}</span>
          <span>
            {balanceDue.toFixed(2)} {tCommon("sar")}
          </span>
        </div>
      </div>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3">{t("discountSection")}</h2>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder={t("amountPlaceholder")}
            value={discountDraft.amount}
            onChange={(e) => setDiscountDraft((d) => ({ ...d, amount: e.target.value }))}
            className="w-24 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder={t("reasonPlaceholder")}
            value={discountDraft.reason}
            onChange={(e) => setDiscountDraft((d) => ({ ...d, reason: e.target.value }))}
            className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <Button
            variant="glass"
            size="sm"
            disabled={!discountDraft.amount || !discountDraft.reason}
            onClick={() => setPendingDiscount({ amount: parseFloat(discountDraft.amount), reason: discountDraft.reason })}
          >
            {t("apply")}
          </Button>
        </div>
      </section>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3">{t("paymentsSection")}</h2>
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between text-sm text-charcoal-100 py-1">
            <span>{t(`paymentMethods.${p.method}`)}</span>
            <span>
              {p.amount.toFixed(2)} {tCommon("sar")}
            </span>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <select
            value={paymentDraft.method}
            onChange={(e) => setPaymentDraft((d) => ({ ...d, method: e.target.value as PaymentMethod }))}
            className="rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="cash">{t("paymentMethods.cash")}</option>
            <option value="card">{t("paymentMethods.card")}</option>
            <option value="apple_pay">{t("paymentMethods.apple_pay")}</option>
            <option value="terminal">{t("paymentMethods.terminal")}</option>
          </select>
          <input
            type="number"
            placeholder={balanceDue.toFixed(2)}
            value={paymentDraft.amount}
            onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))}
            className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <Button variant="glass" size="sm" onClick={recordPayment}>
            {t("add")}
          </Button>
        </div>
      </section>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
          <ArrowRightLeft size={14} /> {t("transferTable")}
        </h2>
        <select
          defaultValue=""
          onChange={(e) => e.target.value && transferTable(e.target.value)}
          className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="" disabled>
            {t("moveTo")}
          </option>
          {tables
            .filter((tbl) => tbl.id !== order.table_id)
            .map((tbl) => (
              <option key={tbl.id} value={tbl.id}>
                {tbl.label}
              </option>
            ))}
        </select>
      </section>

      {notice && <p className="text-xs text-ember-400 mb-3">{notice}</p>}

      <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2" disabled={isPrinting} onClick={finalizeAndPrint}>
        {order.zatca_signed_at ? <Printer size={18} /> : <Receipt size={18} />}
        {isPrinting ? t("working") : order.zatca_signed_at ? t("printReceipt") : t("finalizeAndPrint")}
      </Button>

      {pendingVoidItemId && (
        <SupervisorPinModal
          title={t("approveVoid")}
          onApprove={handleVoid}
          onClose={() => setPendingVoidItemId(null)}
        />
      )}

      {pendingDiscount && (
        <SupervisorPinModal
          title={t("approveDiscount", { amount: pendingDiscount.amount.toFixed(2), reason: pendingDiscount.reason })}
          onApprove={handleDiscount}
          onClose={() => setPendingDiscount(null)}
        />
      )}
    </div>
  );
}
