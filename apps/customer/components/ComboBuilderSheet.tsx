"use client";

import { useEffect, useState } from "react";
import { Button } from "@bbq/ui";
import type { MenuItemView } from "@/lib/menu-data";
import { useCartStore } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import { round2 } from "@/lib/pricing";
import { BottomSheet } from "./BottomSheet";

interface ComboSlot {
  id: string;
  slot_label: string;
  category_id: string;
  quantity: number;
  upcharge: number;
  sort_order: number;
  candidates: { id: string; name_en: string }[];
}

export function ComboBuilderSheet({ item, onClose }: { item: MenuItemView; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem);
  const [slots, setSlots] = useState<ComboSlot[] | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({}); // combo_component_id -> menu_item_id

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: components } = await supabase
        .from("combo_components")
        .select("id, slot_label, category_id, quantity, upcharge, sort_order")
        .eq("combo_menu_item_id", item.id)
        .order("sort_order");

      if (!components || cancelled) return;

      const withCandidates = await Promise.all(
        components.map(async (c) => {
          const { data: candidates } = await supabase
            .from("menu_items")
            .select("id, name_en")
            .eq("category_id", c.category_id)
            .eq("item_type", "single")
            .eq("is_active", true)
            .is("deleted_at", null);
          return { ...c, candidates: candidates ?? [] };
        })
      );

      if (cancelled) return;
      setSlots(withCandidates);
      setSelections(
        Object.fromEntries(withCandidates.filter((s) => s.candidates[0]).map((s) => [s.id, s.candidates[0]!.id]))
      );
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const upchargeTotal = (slots ?? []).reduce((sum, s) => (selections[s.id] ? sum + s.upcharge : sum), 0);
  const total = round2(item.base_price + upchargeTotal);
  const allSlotsFilled = slots ? slots.every((s) => selections[s.id]) : false;

  function handleAdd() {
    if (!slots) return;
    addItem({
      menu_item_id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      image_asset_key: item.image_asset_key,
      quantity: 1,
      base_unit_price: item.base_price,
      weight_tier: null,
      doneness: null,
      notes: null,
      modifiers: [],
      combo_selections: slots.map((s) => ({
        combo_component_id: s.id,
        slot_label: s.slot_label,
        component_menu_item_id: selections[s.id]!,
        component_name_en: s.candidates.find((c) => c.id === selections[s.id])?.name_en ?? "",
        upcharge: s.upcharge,
      })),
    });
    onClose();
  }

  return (
    <BottomSheet
      title={item.name_en}
      onClose={onClose}
      footer={
        <Button variant="primary" size="lg" className="w-full" disabled={!allSlotsFilled} onClick={handleAdd}>
          Add to cart — {total.toFixed(2)} SAR
        </Button>
      }
    >
      {item.description_en && <p className="text-sm text-smoke-400 mb-5">{item.description_en}</p>}

      {!slots && <p className="text-sm text-smoke-400">Loading options…</p>}

      {slots?.map((slot) => (
        <section key={slot.id} className="mb-6">
          <h3 className="text-sm font-medium text-charcoal-100 mb-2">
            {slot.slot_label}
            {slot.upcharge > 0 && <span className="text-smoke-500"> · +{slot.upcharge.toFixed(0)} SAR</span>}
          </h3>
          {slot.candidates.length === 0 ? (
            <p className="text-xs text-red-400">No options available in this category right now.</p>
          ) : (
            <div className="space-y-2">
              {slot.candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  onClick={() => setSelections((prev) => ({ ...prev, [slot.id]: candidate.id }))}
                  className={`w-full flex items-center justify-between rounded-xl2 border px-4 py-2.5 text-sm transition-colors ${
                    selections[slot.id] === candidate.id
                      ? "border-ember-500 bg-ember-500/10 text-white"
                      : "border-white/10 text-charcoal-100"
                  }`}
                >
                  {candidate.name_en}
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </BottomSheet>
  );
}
