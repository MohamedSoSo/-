"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, ArrowRightLeft, Receipt } from "lucide-react";
import { Button } from "@bbq/ui";
import type { OrderStatus, PaymentMethod, ZatcaSignatureStatus } from "@bbq/types";
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
  menu_items: { name_en: string } | { name_en: string }[] | null;
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
              name: firstOf(i.menu_items)?.name_en ?? "Item",
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
          .map((i) => ({ label: firstOf(i.menu_items)?.name_en ?? "Item", qty: i.quantity, amount: i.line_total })),
        subtotal: order.subtotal,
        taxTotal: order.tax_total,
        discountTotal: order.discount_total,
        grandTotal: order.grand_total,
        zatcaQrPayload: qrPayload,
        operatorName: operator?.displayName ?? "Staff",
        placedAt: order.placed_at,
      });

      if (printResult.usedRole === "browser_fallback") {
        setNotice(`Printed via browser (no thermal printer responded): ${printResult.error}`);
      } else if (printResult.usedRole === "secondary") {
        setNotice("Primary printer unavailable — printed via secondary printer.");
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to finalize/print.");
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-white">{order.order_number}</h1>
          <p className="text-sm text-smoke-400 capitalize">
            {order.channel.replace("_", " ")} {tableLabel && `· Table ${tableLabel}`} · {order.status.replace(/_/g, " ")}
          </p>
        </div>
        {order.zatca_signature_status === "signed_stub" && (
          <span className="text-[10px] rounded-full bg-yellow-500/20 text-yellow-300 px-2 py-1">ZATCA: unsigned (stub)</span>
        )}
      </div>

      <div className="space-y-2 mb-6">
        {items.map((item) => (
          <div
            key={item.id}
            className={`glass-panel p-3 flex items-center justify-between ${item.status === "voided" ? "opacity-40" : ""}`}
          >
            <div>
              <p className="text-white text-sm">
                {item.quantity}× {firstOf(item.menu_items)?.name_en ?? "Item"}
              </p>
              <p className="text-xs text-smoke-400 capitalize">
                {item.station} · {item.status.replace(/_/g, " ")}
                {item.weight_grams_ordered && ` · ${item.weight_grams_ordered}g`}
                {item.doneness && ` · ${item.doneness.replace("_", " ")}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-ember-400 text-sm">{item.line_total.toFixed(2)} SAR</span>
              {item.status !== "voided" && (
                <button
                  onClick={() => setPendingVoidItemId(item.id)}
                  className="text-xs text-red-400 border border-red-500/30 rounded-full px-2 py-1"
                >
                  Void
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4 mb-6 space-y-1.5">
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>Subtotal</span>
          <span>{order.subtotal.toFixed(2)} SAR</span>
        </div>
        <div className="flex justify-between text-sm text-charcoal-100">
          <span>VAT ({Math.round(VAT_RATE * 100)}%)</span>
          <span>{order.tax_total.toFixed(2)} SAR</span>
        </div>
        {order.discount_total > 0 && (
          <div className="flex justify-between text-sm text-charcoal-100">
            <span>Discount</span>
            <span>-{order.discount_total.toFixed(2)} SAR</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold text-white pt-1.5 border-t border-white/5">
          <span>Total</span>
          <span>{order.grand_total.toFixed(2)} SAR</span>
        </div>
        <div className="flex justify-between text-sm text-emerald-400">
          <span>Paid</span>
          <span>{paidTotal.toFixed(2)} SAR</span>
        </div>
        <div className="flex justify-between text-sm text-ember-400 font-medium">
          <span>Balance due</span>
          <span>{balanceDue.toFixed(2)} SAR</span>
        </div>
      </div>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3">Discount</h2>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount"
            value={discountDraft.amount}
            onChange={(e) => setDiscountDraft((d) => ({ ...d, amount: e.target.value }))}
            className="w-24 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <input
            type="text"
            placeholder="Reason"
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
            Apply
          </Button>
        </div>
      </section>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3">Payments (split-bill friendly — add as many as needed)</h2>
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between text-sm text-charcoal-100 py-1">
            <span className="capitalize">{p.method.replace("_", " ")}</span>
            <span>{p.amount.toFixed(2)} SAR</span>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <select
            value={paymentDraft.method}
            onChange={(e) => setPaymentDraft((d) => ({ ...d, method: e.target.value as PaymentMethod }))}
            className="rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="apple_pay">Apple Pay</option>
            <option value="terminal">Terminal</option>
          </select>
          <input
            type="number"
            placeholder={balanceDue.toFixed(2)}
            value={paymentDraft.amount}
            onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))}
            className="flex-1 rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
          <Button variant="glass" size="sm" onClick={recordPayment}>
            Add
          </Button>
        </div>
      </section>

      <section className="glass-panel p-4 mb-6">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
          <ArrowRightLeft size={14} /> Transfer table
        </h2>
        <select
          defaultValue=""
          onChange={(e) => e.target.value && transferTable(e.target.value)}
          className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        >
          <option value="" disabled>
            Move to…
          </option>
          {tables
            .filter((t) => t.id !== order.table_id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
        </select>
      </section>

      {notice && <p className="text-xs text-ember-400 mb-3">{notice}</p>}

      <Button variant="primary" size="lg" className="w-full flex items-center justify-center gap-2" disabled={isPrinting} onClick={finalizeAndPrint}>
        {order.zatca_signed_at ? <Printer size={18} /> : <Receipt size={18} />}
        {isPrinting ? "Working…" : order.zatca_signed_at ? "Print receipt" : "Finalize invoice & print"}
      </Button>

      {pendingVoidItemId && (
        <SupervisorPinModal
          title="Approve void — cooked grill items convert to waste automatically."
          onApprove={handleVoid}
          onClose={() => setPendingVoidItemId(null)}
        />
      )}

      {pendingDiscount && (
        <SupervisorPinModal
          title={`Approve ${pendingDiscount.amount.toFixed(2)} SAR discount — ${pendingDiscount.reason}`}
          onApprove={handleDiscount}
          onClose={() => setPendingDiscount(null)}
        />
      )}
    </div>
  );
}
