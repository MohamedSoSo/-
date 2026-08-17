"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { KdsItem } from "@/lib/kds-data";
import { createClient } from "@/lib/supabase/client";
import { SLA_RED_MINUTES, SLA_YELLOW_MINUTES } from "@/lib/constants";
import { WeightEntryModal } from "./WeightEntryModal";
import type { OrderStatus } from "@bbq/types";
import { usePosSession } from "@/lib/pos-session";

type View = "grill" | "assembly";

function firstOf<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function nextStatus(item: KdsItem): OrderStatus | null {
  const inProgress = item.station === "grill" ? "grilling" : "kitchen_prep";
  if (item.status === "placed" || item.status === "confirmed") return inProgress;
  if (item.status === inProgress) return "ready";
  if (item.status === "ready") return "served";
  return null;
}

function slaColor(createdAt: string): "green" | "yellow" | "red" {
  const minutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
  if (minutes >= SLA_RED_MINUTES) return "red";
  if (minutes >= SLA_YELLOW_MINUTES) return "yellow";
  return "green";
}

const SLA_CLASSES = {
  green: "border-emerald-500/40 bg-emerald-500/5",
  yellow: "border-yellow-500/50 bg-yellow-500/10",
  red: "border-red-500/60 bg-red-500/10 animate-pulse",
};

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // audio context unavailable (e.g. no user gesture yet) — visual alert still fires
  }
}

export function KdsBoard({ initialItems }: { initialItems: KdsItem[] }) {
  const operator = usePosSession((s) => s.operator);
  const [view, setView] = useState<View>("grill");
  const [items, setItems] = useState(initialItems);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const [weighingItem, setWeighingItem] = useState<KdsItem | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("kds_board")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "order_items" }, async (payload) => {
        const row = payload.new as KdsItem;
        playBeep();
        setFlashIds((prev) => new Set(prev).add(row.id));
        setTimeout(() => setFlashIds((prev) => { const n = new Set(prev); n.delete(row.id); return n; }), 4000);
        setItems((prev) => [...prev, row]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "order_items" }, (payload) => {
        const row = payload.new as KdsItem;
        if (row.status === "voided") {
          setFlashIds((prev) => new Set(prev).add(row.id));
          setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== row.id)), 3000);
        } else if (["served", "completed", "cancelled"].includes(row.status)) {
          setItems((prev) => prev.filter((i) => i.id !== row.id));
        } else {
          setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...row } : i)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function advance(item: KdsItem) {
    const next = nextStatus(item);
    if (!next) return;

    // grill items moving into 'ready' get their actual cooked weight
    // recorded first — feeds Owner BI yield/meat-loss tracking (Phase 4).
    if (item.station === "grill" && item.status === "grilling" && next === "ready") {
      setWeighingItem(item);
      return;
    }

    const supabase = createClient();
    await supabase.from("order_items").update({ status: next }).eq("id", item.id);
    await supabase.from("order_item_status_events").insert({
      order_item_id: item.id,
      from_status: item.status as OrderStatus,
      to_status: next,
      staff_id: operator?.profileId ?? null,
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
  }

  async function confirmWeight(grams: number, manualReason: string | null) {
    if (!weighingItem) return;
    const supabase = createClient();
    await supabase
      .from("order_items")
      .update({
        status: "ready",
        weight_grams_actual: grams,
        notes: manualReason ? `[Manual weight: ${manualReason}]` : undefined,
      })
      .eq("id", weighingItem.id);
    await supabase.from("order_item_status_events").insert({
      order_item_id: weighingItem.id,
      from_status: weighingItem.status as OrderStatus,
      to_status: "ready",
      staff_id: operator?.profileId ?? null,
    });
    setItems((prev) => prev.map((i) => (i.id === weighingItem.id ? { ...i, status: "ready" } : i)));
    setWeighingItem(null);
  }

  const visible = items.filter((i) => (view === "grill" ? i.station === "grill" : i.station !== "grill"));

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Flame size={20} className="text-ember-500" /> Kitchen
        </h1>
        <div className="flex rounded-full border border-white/10 p-1">
          {(["grill", "assembly"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize ${
                view === v ? "bg-ember-500 text-charcoal-900 font-medium" : "text-charcoal-100"
              }`}
            >
              {v === "grill" ? "Grill station" : "Assembly / Drinks"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {visible.map((item) => {
            const order = firstOf(item.orders);
            const color = flashIds.has(item.id) ? "red" : slaColor(item.created_at);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-2xl border-2 p-4 ${SLA_CLASSES[color]}`}
              >
                <div className="flex justify-between text-xs text-smoke-400 mb-1">
                  <span>
                    {order?.order_number} {firstOf(order?.restaurant_tables ?? null)?.label && `· T-${firstOf(order?.restaurant_tables ?? null)?.label}`}
                  </span>
                  <span>{Math.floor((Date.now() - new Date(item.created_at).getTime()) / 60000)}m</span>
                </div>
                <p className="text-white font-medium">
                  {item.quantity}× {firstOf(item.menu_items)?.name_en ?? "Item"}
                </p>
                {item.weight_grams_ordered && <p className="text-sm text-smoke-300">{item.weight_grams_ordered}g</p>}
                {item.doneness && <p className="text-sm text-smoke-300 capitalize">{item.doneness.replace("_", " ")}</p>}
                {item.notes && <p className="text-xs text-ember-400 mt-1">{item.notes}</p>}
                <button
                  onClick={() => advance(item)}
                  className="mt-3 w-full rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm py-2 capitalize"
                >
                  {nextStatus(item)?.replace("_", " ") ?? "Done"}
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {visible.length === 0 && <p className="text-smoke-400 text-sm col-span-full">No active tickets.</p>}
      </div>

      {weighingItem && (
        <WeightEntryModal
          itemLabel={`${weighingItem.quantity}× ${firstOf(weighingItem.menu_items)?.name_en ?? "Item"}`}
          orderedGrams={weighingItem.weight_grams_ordered}
          onSubmit={confirmWeight}
          onClose={() => setWeighingItem(null)}
        />
      )}
    </div>
  );
}
