"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@bbq/ui";
import type { DonenessLevel } from "@bbq/types";
import type { MenuItemView } from "@/lib/menu-data";
import { useCartStore } from "@/lib/cart-store";
import { round2 } from "@/lib/pricing";
import { BottomSheet } from "./BottomSheet";

const DONENESS_LABELS: Record<DonenessLevel, string> = {
  rare: "Rare",
  medium_rare: "Medium Rare",
  medium: "Medium",
  medium_well: "Medium Well",
  well_done: "Well Done",
};

export function ItemCustomizeSheet({ item, onClose }: { item: MenuItemView; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem);

  const [displayUnit, setDisplayUnit] = useState<"g" | "kg">(item.default_weight_unit);
  const [weightTierId, setWeightTierId] = useState(item.weight_tiers[0]?.id ?? null);
  const [doneness, setDoneness] = useState<DonenessLevel | null>(item.available_doneness_levels[0] ?? null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const weightTier = item.weight_tiers.find((t) => t.id === weightTierId) ?? null;

  const flatSelectedModifiers = useMemo(() => {
    return item.modifier_groups.flatMap((g) =>
      g.modifiers.filter((m) => selectedModifiers[g.id]?.has(m.id))
    );
  }, [item.modifier_groups, selectedModifiers]);

  const unitPrice = round2(
    item.base_price * (weightTier?.price_multiplier ?? 1) +
      flatSelectedModifiers.reduce((sum, m) => sum + m.price_delta, 0)
  );

  const unmetRequiredGroups = item.modifier_groups.filter(
    (g) => g.is_required && (selectedModifiers[g.id]?.size ?? 0) < g.min_select
  );
  const canAdd = unmetRequiredGroups.length === 0 && (!item.is_weight_based || !!weightTierId);

  function toggleModifier(groupId: string, modifierId: string, selectionType: "single" | "multiple", max: number) {
    setSelectedModifiers((prev) => {
      const current = new Set(prev[groupId] ?? []);
      if (selectionType === "single") {
        return { ...prev, [groupId]: current.has(modifierId) ? new Set() : new Set([modifierId]) };
      }
      if (current.has(modifierId)) current.delete(modifierId);
      else if (current.size < max) current.add(modifierId);
      return { ...prev, [groupId]: current };
    });
  }

  function handleAdd() {
    addItem({
      menu_item_id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      image_asset_key: item.image_asset_key,
      quantity,
      base_unit_price: item.base_price,
      weight_tier: weightTier,
      doneness,
      notes: notes.trim() || null,
      modifiers: flatSelectedModifiers,
      combo_selections: [],
    });
    onClose();
  }

  return (
    <BottomSheet
      title={item.name_en}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          {unmetRequiredGroups.length > 0 && (
            <p className="text-xs text-ember-400">
              Choose {unmetRequiredGroups.map((g) => g.name_en.toLowerCase()).join(", ")} to continue.
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 px-3 py-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <Minus size={16} className="text-smoke-400" />
              </button>
              <span className="text-white w-5 text-center">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label="Increase quantity">
                <Plus size={16} className="text-smoke-400" />
              </button>
            </div>
            <Button variant="primary" size="lg" className="flex-1" disabled={!canAdd} onClick={handleAdd}>
              Add to cart — {round2(unitPrice * quantity).toFixed(2)} SAR
            </Button>
          </div>
        </div>
      }
    >
      {item.description_en && <p className="text-sm text-smoke-400 mb-5">{item.description_en}</p>}

      {item.is_weight_based && item.weight_tiers.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-charcoal-100">Weight</h3>
            <div className="flex rounded-full border border-white/10 p-0.5 text-xs">
              {(["g", "kg"] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setDisplayUnit(u)}
                  className={`px-2 py-1 rounded-full ${displayUnit === u ? "bg-white/10 text-white" : "text-smoke-500"}`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {item.weight_tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setWeightTierId(tier.id)}
                className={`rounded-xl2 border px-3 py-2.5 text-center transition-colors ${
                  weightTierId === tier.id
                    ? "border-ember-500 bg-ember-500/10 text-white"
                    : "border-white/10 text-charcoal-100"
                }`}
              >
                <p className="text-sm font-medium">
                  {displayUnit === "kg" ? `${(tier.grams / 1000).toFixed(tier.grams % 1000 === 0 ? 0 : 2)}kg` : tier.label}
                </p>
                <p className="text-xs text-smoke-500">
                  {round2(item.base_price * tier.price_multiplier).toFixed(0)} SAR
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {item.supports_doneness && item.available_doneness_levels.length > 0 && (
        <section className="mb-6">
          <h3 className="text-sm font-medium text-charcoal-100 mb-2">Doneness</h3>
          <div className="flex flex-wrap gap-2">
            {item.available_doneness_levels.map((level) => (
              <button
                key={level}
                onClick={() => setDoneness(level)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  doneness === level ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                }`}
              >
                {DONENESS_LABELS[level]}
              </button>
            ))}
          </div>
        </section>
      )}

      {item.modifier_groups.map((group) => (
        <section key={group.id} className="mb-6">
          <h3 className="text-sm font-medium text-charcoal-100 mb-2">
            {group.name_en}
            {group.is_required && <span className="text-ember-400"> · required</span>}
            {group.selection_type === "multiple" && (
              <span className="text-smoke-500"> · up to {group.max_select}</span>
            )}
          </h3>
          <div className="space-y-2">
            {group.modifiers.map((mod) => {
              const isSelected = selectedModifiers[group.id]?.has(mod.id) ?? false;
              return (
                <button
                  key={mod.id}
                  onClick={() => toggleModifier(group.id, mod.id, group.selection_type, group.max_select)}
                  className={`w-full flex items-center justify-between rounded-xl2 border px-4 py-2.5 text-sm transition-colors ${
                    isSelected ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                  }`}
                >
                  <span>{mod.name_en}</span>
                  <span className="text-smoke-400">{mod.price_delta > 0 ? `+${mod.price_delta.toFixed(0)} SAR` : "Free"}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h3 className="text-sm font-medium text-charcoal-100 mb-2">Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder="Any special requests?"
          rows={2}
          className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-smoke-500 focus:border-ember-500 focus:outline-none"
        />
      </section>
    </BottomSheet>
  );
}
