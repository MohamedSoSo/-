"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { OrderChannel, OrderStatus } from "@bbq/types";
import { createClient } from "@/lib/supabase/client";
import { currentStepIndex, isTerminalFailure, stepsForChannel } from "@/lib/order-steps";

export interface TrackedOrder {
  id: string;
  order_number: string;
  channel: OrderChannel;
  status: OrderStatus;
  grand_total: number;
  table_label: string | null;
}

export interface TrackedOrderItem {
  id: string;
  name_en: string;
  quantity: number;
  line_total: number;
}

export function OrderTracker({
  initialOrder,
  initialItems,
}: {
  initialOrder: TrackedOrder;
  initialItems: TrackedOrderItem[];
}) {
  const [order, setOrder] = useState(initialOrder);
  const [items] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`order_${initialOrder.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${initialOrder.id}` },
        (payload) => {
          const next = payload.new as { status: OrderStatus; grand_total: number };
          setOrder((prev) => ({ ...prev, status: next.status, grand_total: next.grand_total }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initialOrder.id]);

  const steps = stepsForChannel(order.channel);
  const activeIndex = currentStepIndex(order.channel, order.status);
  const failed = isTerminalFailure(order.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="glass-panel p-5 mb-6">
        <p className="text-sm text-smoke-400">Order</p>
        <p className="text-xl font-semibold text-white">{order.order_number}</p>
        {order.table_label && <p className="text-sm text-smoke-400 mt-1">Table {order.table_label}</p>}
      </div>

      {failed ? (
        <div className="glass-panel p-5 mb-6 border-red-500/30">
          <p className="text-red-400 font-medium capitalize">Order {order.status}</p>
          <p className="text-sm text-smoke-400 mt-1">
            Please speak to a staff member if you have questions about this order.
          </p>
        </div>
      ) : (
        <ol className="space-y-1 mb-6">
          {steps.map((step, idx) => {
            const done = idx < activeIndex;
            const active = idx === activeIndex;
            return (
              <li key={step.status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: done || active ? "var(--brand-accent)" : "rgba(255,255,255,0.08)",
                      scale: active ? 1.15 : 1,
                    }}
                    className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
                  >
                    {done ? (
                      <Check size={14} className="text-charcoal-900" />
                    ) : (
                      <span className={`h-2 w-2 rounded-full ${active ? "bg-charcoal-900" : "bg-white/30"}`} />
                    )}
                  </motion.div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 h-8" style={{ background: done ? "var(--brand-accent)" : "rgba(255,255,255,0.08)" }} />
                  )}
                </div>
                <p className={`pt-1 text-sm ${active ? "text-white font-medium" : done ? "text-charcoal-100" : "text-smoke-500"}`}>
                  {step.label}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      <div className="glass-panel p-5">
        <p className="text-sm font-medium text-charcoal-100 mb-3">Items</p>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-charcoal-100">
                {item.quantity}× {item.name_en}
              </span>
              <span className="text-smoke-400">{item.line_total.toFixed(2)} SAR</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-base font-semibold text-white pt-3 mt-3 border-t border-white/5">
          <span>Total</span>
          <span>{order.grand_total.toFixed(2)} SAR</span>
        </div>
      </div>
    </div>
  );
}
