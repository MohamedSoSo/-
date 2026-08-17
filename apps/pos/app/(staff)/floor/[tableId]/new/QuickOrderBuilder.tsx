"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@bbq/ui";
import type { QuickMenuCategory } from "@/lib/quick-menu";
import { submitOrQueue } from "@/lib/offline/submit";

interface Line {
  menu_item_id: string;
  name_en: string;
  quantity: number;
  weight_tier_id: string | null;
  unit_price: number;
}

export function QuickOrderBuilder({ tableId, categories }: { tableId: string; categories: QuickMenuCategory[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine(itemId: string, name: string, unitPrice: number, weightTierId: string | null) {
    setLines((prev) => {
      const existing = prev.find((l) => l.menu_item_id === itemId && l.weight_tier_id === weightTierId);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menu_item_id: itemId, name_en: name, quantity: 1, weight_tier_id: weightTierId, unit_price: unitPrice }];
    });
  }

  function adjustQty(idx: number, delta: number) {
    setLines((prev) => {
      const next = [...prev];
      const line = next[idx];
      if (!line) return prev;
      const qty = line.quantity + delta;
      if (qty <= 0) {
        next.splice(idx, 1);
        return next;
      }
      next[idx] = { ...line, quantity: qty };
      return next;
    });
  }

  const total = lines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);

  async function submit() {
    if (lines.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    const result = await submitOrQueue<{ order_id: string; order_number: string }[]>("place_order", "place_order", {
      p_channel: "qr_table",
      p_table_id: tableId,
      p_scheduled_for: null,
      p_delivery_address: null,
      p_delivery_lat: null,
      p_delivery_lng: null,
      p_delivery_notes: null,
      p_items: lines.map((l) => ({
        menu_item_id: l.menu_item_id,
        quantity: l.quantity,
        weight_tier_id: l.weight_tier_id,
      })),
    }).catch((e: Error) => {
      setError(e.message);
      return null;
    });

    setIsSubmitting(false);
    if (!result) return;

    if (result.queued) {
      router.push("/floor");
      return;
    }
    const orderId = result.data?.[0]?.order_id;
    router.push(orderId ? `/order/${orderId}` : "/floor");
  }

  return (
    <div>
      {categories.map((cat) => (
        <section key={cat.id} className="mb-6">
          <h2 className="text-sm font-medium text-charcoal-100 mb-2">{cat.name_en}</h2>
          <div className="grid grid-cols-2 gap-2">
            {cat.items.map((item) =>
              item.is_weight_based ? (
                item.weight_tiers.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => addLine(item.id, `${item.name_en} (${tier.label})`, item.base_price * tier.price_multiplier, tier.id)}
                    className="rounded-xl2 border border-white/10 px-3 py-2.5 text-left text-sm text-charcoal-100 hover:border-ember-500/40"
                  >
                    <p>{item.name_en}</p>
                    <p className="text-xs text-smoke-500">
                      {tier.label} · {(item.base_price * tier.price_multiplier).toFixed(0)} SAR
                    </p>
                  </button>
                ))
              ) : (
                <button
                  key={item.id}
                  onClick={() => addLine(item.id, item.name_en, item.base_price, null)}
                  className="rounded-xl2 border border-white/10 px-3 py-2.5 text-left text-sm text-charcoal-100 hover:border-ember-500/40"
                >
                  <p>{item.name_en}</p>
                  <p className="text-xs text-smoke-500">{item.base_price.toFixed(0)} SAR</p>
                </button>
              )
            )}
          </div>
        </section>
      ))}

      <div className="fixed bottom-0 left-0 right-0 bg-charcoal-900 border-t border-white/10 p-4">
        <div className="max-w-2xl mx-auto">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1">
              <span className="text-charcoal-100">{line.name_en}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => adjustQty(idx, -1)}>
                  <Minus size={14} className="text-smoke-400" />
                </button>
                <span className="text-white w-4 text-center">{line.quantity}</span>
                <button onClick={() => adjustQty(idx, 1)}>
                  <Plus size={14} className="text-smoke-400" />
                </button>
                <span className="text-ember-400 w-16 text-right">{(line.unit_price * line.quantity).toFixed(0)} SAR</span>
              </div>
            </div>
          ))}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            disabled={lines.length === 0 || isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? "Placing…" : `Send order — ${total.toFixed(0)} SAR`}
          </Button>
        </div>
      </div>
    </div>
  );
}
