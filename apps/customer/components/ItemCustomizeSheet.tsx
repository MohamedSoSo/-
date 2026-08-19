"use client";

import { useId, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { localizedField, localizedFieldNullable, type Locale } from "@bbq/i18n";
import type { DonenessLevel } from "@bbq/types";
import type { MenuItemView } from "@/lib/menu-data";
import { useCartStore } from "@/lib/cart-store";
import { round2 } from "@/lib/pricing";
import { BottomSheet } from "./BottomSheet";

export function ItemCustomizeSheet({ item, onClose }: { item: MenuItemView; onClose: () => void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("itemSheet");
  const tCommon = useTranslations("common");
  const tDoneness = useTranslations("doneness");
  const addItem = useCartStore((s) => s.addItem);

  const [displayUnit, setDisplayUnit] = useState<"g" | "kg">(item.default_weight_unit);
  const [weightTierId, setWeightTierId] = useState(item.weight_tiers[0]?.id ?? null);
  const [doneness, setDoneness] = useState<DonenessLevel | null>(item.available_doneness_levels[0] ?? null);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const weightHeadingId = useId();
  const donenessHeadingId = useId();
  const notesHeadingId = useId();
  const requiredGroupsMsgId = useId();

  const weightTier = item.weight_tiers.find((t) => t.id === weightTierId) ?? null;
  const itemName = localizedField(item.name_en, item.name_ar, locale);
  const itemDescription = localizedFieldNullable(item.description_en, item.description_ar, locale);

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
      image_path: item.image_path,
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
      title={itemName}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          {unmetRequiredGroups.length > 0 && (
            <p id={requiredGroupsMsgId} role="status" aria-live="polite" className="text-xs text-ember-400">
              {t("chooseToContinue", {
                groups: unmetRequiredGroups
                  .map((g) => localizedField(g.name_en, g.name_ar, locale).toLowerCase())
                  .join(locale === "ar" ? "، " : ", "),
              })}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 rounded-full border border-white/10 px-3 py-2">
              <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label={tCommon("decreaseQuantity")}>
                <Minus size={16} className="text-smoke-400" />
              </button>
              <span className="text-white w-5 text-center">{quantity}</span>
              <button onClick={() => setQuantity((q) => q + 1)} aria-label={tCommon("increaseQuantity")}>
                <Plus size={16} className="text-smoke-400" />
              </button>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={!canAdd}
              onClick={handleAdd}
              aria-describedby={unmetRequiredGroups.length > 0 ? requiredGroupsMsgId : undefined}
            >
              {t("addToCart", { price: round2(unitPrice * quantity).toFixed(2) })}
            </Button>
          </div>
        </div>
      }
    >
      {itemDescription && <p className="text-sm text-smoke-400 mb-5">{itemDescription}</p>}

      {item.is_weight_based && item.weight_tiers.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 id={weightHeadingId} className="text-sm font-medium text-charcoal-100">{t("weight")}</h3>
            <div role="radiogroup" aria-label={t("weightUnitLabel")} className="flex rounded-full border border-white/10 p-0.5 text-xs">
              {(["g", "kg"] as const).map((u) => (
                <button
                  key={u}
                  role="radio"
                  aria-checked={displayUnit === u}
                  onClick={() => setDisplayUnit(u)}
                  className={`px-2 py-1 rounded-full ${displayUnit === u ? "bg-white/10 text-white" : "text-smoke-400"}`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div role="radiogroup" aria-labelledby={weightHeadingId} className="grid grid-cols-3 gap-2">
            {item.weight_tiers.map((tier) => (
              <button
                key={tier.id}
                role="radio"
                aria-checked={weightTierId === tier.id}
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
                <p className="text-xs text-smoke-400">
                  {round2(item.base_price * tier.price_multiplier).toFixed(0)} {tCommon("sar")}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {item.supports_doneness && item.available_doneness_levels.length > 0 && (
        <section className="mb-6">
          <h3 id={donenessHeadingId} className="text-sm font-medium text-charcoal-100 mb-2">{t("doneness")}</h3>
          <div role="radiogroup" aria-labelledby={donenessHeadingId} className="flex flex-wrap gap-2">
            {item.available_doneness_levels.map((level) => (
              <button
                key={level}
                role="radio"
                aria-checked={doneness === level}
                onClick={() => setDoneness(level)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  doneness === level ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                }`}
              >
                {tDoneness(level)}
              </button>
            ))}
          </div>
        </section>
      )}

      {item.modifier_groups.map((group) => {
        const groupHeadingId = `${group.id}-heading`;
        const isSingle = group.selection_type === "single";
        return (
          <section key={group.id} className="mb-6">
            <h3 id={groupHeadingId} className="text-sm font-medium text-charcoal-100 mb-2">
              {localizedField(group.name_en, group.name_ar, locale)}
              {group.is_required && <span className="text-ember-400"> · {t("required")}</span>}
              {group.selection_type === "multiple" && (
                <span className="text-smoke-400"> · {t("upTo", { count: group.max_select })}</span>
              )}
            </h3>
            <div
              role={isSingle ? "radiogroup" : "group"}
              aria-labelledby={groupHeadingId}
              className="space-y-2"
            >
              {group.modifiers.map((mod) => {
                const isSelected = selectedModifiers[group.id]?.has(mod.id) ?? false;
                return (
                  <button
                    key={mod.id}
                    role={isSingle ? "radio" : undefined}
                    aria-checked={isSingle ? isSelected : undefined}
                    aria-pressed={isSingle ? undefined : isSelected}
                    onClick={() => toggleModifier(group.id, mod.id, group.selection_type, group.max_select)}
                    className={`w-full flex items-center justify-between rounded-xl2 border px-4 py-2.5 text-sm transition-colors ${
                      isSelected ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                    }`}
                  >
                    <span>{localizedField(mod.name_en, mod.name_ar, locale)}</span>
                    <span className="text-smoke-400">
                      {mod.price_delta > 0 ? t("priceAdd", { price: mod.price_delta.toFixed(0) }) : t("free")}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      <section>
        <h3 id={notesHeadingId} className="text-sm font-medium text-charcoal-100 mb-2">{t("notes")}</h3>
        <textarea
          aria-labelledby={notesHeadingId}
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 280))}
          placeholder={t("notesPlaceholder")}
          rows={2}
          className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-smoke-400 focus:border-ember-500 focus:outline-none"
        />
      </section>
    </BottomSheet>
  );
}
