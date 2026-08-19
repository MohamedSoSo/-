"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, RotateCcw, Trash2, Star, ImageOff, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { upsertMenuItem, setMenuItemDeleted } from "./actions";
import { CatalogImageUploader } from "./CatalogImageUploader";
import type { CategoryRow } from "./CategoryManager";

const DONENESS_LEVELS = ["rare", "medium_rare", "medium", "medium_well", "well_done"] as const;
const STATIONS = ["grill", "kitchen", "bar", "dessert"] as const;

export interface MenuItemRow {
  id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  category_id: string;
  base_price: number;
  is_weight_based: boolean;
  default_weight_unit: "g" | "kg";
  supports_doneness: boolean;
  available_doneness_levels: string[];
  default_station: "grill" | "kitchen" | "bar" | "dessert";
  is_active: boolean;
  is_featured: boolean;
  deleted_at: string | null;
  image_path: string | null;
  image_url: string | null;
  weight_tiers: { id: string; label: string; grams: number; price_multiplier: number }[];
}

interface TierDraft {
  label: string;
  grams: string;
  price_multiplier: string;
}

function MenuItemForm({
  categories,
  initial,
  onDone,
}: {
  categories: CategoryRow[];
  initial?: MenuItemRow;
  onDone: () => void;
}) {
  const t = useTranslations("catalog.itemForm");
  const nameEnId = useId();
  const nameArId = useId();
  const descEnId = useId();
  const descArId = useId();
  const categoryId = useId();
  const priceId = useId();
  const stationId = useId();

  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [descEn, setDescEn] = useState(initial?.description_en ?? "");
  const [descAr, setDescAr] = useState(initial?.description_ar ?? "");
  const [categoryIdVal, setCategoryIdVal] = useState(initial?.category_id ?? categories[0]?.id ?? "");
  const [price, setPrice] = useState(String(initial?.base_price ?? ""));
  const [isWeightBased, setIsWeightBased] = useState(initial?.is_weight_based ?? false);
  const [tiers, setTiers] = useState<TierDraft[]>(
    initial?.weight_tiers.map((wt) => ({ label: wt.label, grams: String(wt.grams), price_multiplier: String(wt.price_multiplier) })) ?? []
  );
  const [supportsDoneness, setSupportsDoneness] = useState(initial?.supports_doneness ?? false);
  const [doneness, setDoneness] = useState<Set<string>>(new Set(initial?.available_doneness_levels ?? []));
  const [station, setStation] = useState<(typeof STATIONS)[number]>(initial?.default_station ?? "kitchen");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(initial?.is_featured ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(initial?.id ?? null);

  function addTier() {
    setTiers((prev) => [...prev, { label: "", grams: "", price_multiplier: "1" }]);
  }
  function updateTier(i: number, patch: Partial<TierDraft>) {
    setTiers((prev) => prev.map((tier, idx) => (idx === i ? { ...tier, ...patch } : tier)));
  }
  function removeTier(i: number) {
    setTiers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleDoneness(level: string) {
    setDoneness((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      const id = await upsertMenuItem({
        id: initial?.id,
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        description_en: descEn.trim() || null,
        description_ar: descAr.trim() || null,
        category_id: categoryIdVal,
        base_price: parseFloat(price) || 0,
        is_weight_based: isWeightBased,
        default_weight_unit: "g",
        supports_doneness: supportsDoneness,
        available_doneness_levels: Array.from(doneness) as (typeof DONENESS_LEVELS)[number][],
        default_station: station,
        is_active: isActive,
        is_featured: isFeatured,
        weight_tiers: isWeightBased
          ? tiers
              .filter((tr) => tr.label.trim() && tr.grams)
              .map((tr) => ({
                label: tr.label.trim(),
                grams: parseInt(tr.grams, 10),
                price_multiplier: parseFloat(tr.price_multiplier) || 1,
                sort_order: 0,
              }))
          : [],
      });
      setSavedId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-panel p-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={nameEnId} className="text-xs text-smoke-400 block mb-1">
            {t("nameEn")}
          </label>
          <input
            id={nameEnId}
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor={nameArId} className="text-xs text-smoke-400 block mb-1">
            {t("nameAr")}
          </label>
          <input
            id={nameArId}
            dir="rtl"
            value={nameAr}
            onChange={(e) => setNameAr(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor={descEnId} className="text-xs text-smoke-400 block mb-1">
            {t("descriptionEn")}
          </label>
          <textarea
            id={descEnId}
            rows={2}
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor={descArId} className="text-xs text-smoke-400 block mb-1">
            {t("descriptionAr")}
          </label>
          <textarea
            id={descArId}
            dir="rtl"
            rows={2}
            value={descAr}
            onChange={(e) => setDescAr(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={categoryId} className="text-xs text-smoke-400 block mb-1">
            {t("category")}
          </label>
          <select
            id={categoryId}
            value={categoryIdVal}
            onChange={(e) => setCategoryIdVal(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={priceId} className="text-xs text-smoke-400 block mb-1">
            {t("basePrice")}
          </label>
          <input
            id={priceId}
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor={stationId} className="text-xs text-smoke-400 block mb-1">
            {t("station")}
          </label>
          <select
            id={stationId}
            value={station}
            onChange={(e) => setStation(e.target.value as (typeof STATIONS)[number])}
            className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
          >
            {STATIONS.map((s) => (
              <option key={s} value={s}>
                {t(`stations.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-charcoal-100">
          <input type="checkbox" checked={isWeightBased} onChange={(e) => setIsWeightBased(e.target.checked)} />
          {t("isWeightBased")}
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal-100">
          <input type="checkbox" checked={supportsDoneness} onChange={(e) => setSupportsDoneness(e.target.checked)} />
          {t("supportsDoneness")}
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal-100">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          {t("isActive")}
        </label>
        <label className="flex items-center gap-2 text-sm text-ember-400">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <Star size={14} aria-hidden="true" /> {t("isFeatured")}
        </label>
      </div>

      {isWeightBased && (
        <fieldset className="border border-white/10 rounded-lg p-3">
          <legend className="text-xs text-smoke-400 px-1">{t("weightTiers")}</legend>
          <div className="space-y-2">
            {tiers.map((tier, i) => (
              <div key={i} className="flex gap-2 items-center">
                <label className="sr-only" htmlFor={`tier-label-${i}`}>
                  {t("tierLabel")}
                </label>
                <input
                  id={`tier-label-${i}`}
                  placeholder={t("tierLabel")}
                  value={tier.label}
                  onChange={(e) => updateTier(i, { label: e.target.value })}
                  className="flex-1 rounded-lg bg-charcoal-800 border border-white/10 px-2 py-1.5 text-sm text-white"
                />
                <label className="sr-only" htmlFor={`tier-grams-${i}`}>
                  {t("tierGrams")}
                </label>
                <input
                  id={`tier-grams-${i}`}
                  type="number"
                  placeholder={t("tierGrams")}
                  value={tier.grams}
                  onChange={(e) => updateTier(i, { grams: e.target.value })}
                  className="w-24 rounded-lg bg-charcoal-800 border border-white/10 px-2 py-1.5 text-sm text-white"
                />
                <label className="sr-only" htmlFor={`tier-mult-${i}`}>
                  {t("tierMultiplier")}
                </label>
                <input
                  id={`tier-mult-${i}`}
                  type="number"
                  step="0.01"
                  placeholder={t("tierMultiplier")}
                  value={tier.price_multiplier}
                  onChange={(e) => updateTier(i, { price_multiplier: e.target.value })}
                  className="w-24 rounded-lg bg-charcoal-800 border border-white/10 px-2 py-1.5 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => removeTier(i)}
                  aria-label={t("removeTier")}
                  className="p-1.5 text-smoke-400 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <Button variant="glass" size="sm" onClick={addTier} className="flex items-center gap-1.5">
              <Plus size={12} /> {t("addTier")}
            </Button>
          </div>
        </fieldset>
      )}

      {supportsDoneness && (
        <fieldset className="border border-white/10 rounded-lg p-3">
          <legend className="text-xs text-smoke-400 px-1">{t("doneness")}</legend>
          <div className="flex flex-wrap gap-2">
            {DONENESS_LEVELS.map((level) => (
              <label
                key={level}
                className={`text-xs rounded-full px-3 py-1.5 border cursor-pointer ${
                  doneness.has(level) ? "border-ember-500 bg-ember-500/10 text-white" : "border-white/10 text-charcoal-100"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={doneness.has(level)}
                  onChange={() => toggleDoneness(level)}
                />
                {t(`donenessLevels.${level}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {savedId && (
        <CatalogImageUploader itemId={savedId} label={t("image")} currentUrl={initial?.image_url ?? null} />
      )}

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={isSaving || !nameEn.trim() || !nameAr.trim() || !categoryIdVal}
          onClick={save}
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
        <Button variant="glass" size="sm" onClick={onDone}>
          {t("done")}
        </Button>
      </div>
    </div>
  );
}

export function MenuItemManager({ categories, items }: { categories: CategoryRow[]; items: MenuItemRow[] }) {
  const t = useTranslations("catalog.itemManager");
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: "list" } | { kind: "create" } | { kind: "edit"; row: MenuItemRow }>({
    kind: "list",
  });
  const [error, setError] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const activeItems = useMemo(() => items.filter((i) => !i.deleted_at), [items]);
  const deletedItems = useMemo(() => items.filter((i) => i.deleted_at), [items]);
  const visibleItems = showDeleted ? items : activeItems;

  async function toggleDeleted(row: MenuItemRow) {
    setError(null);
    try {
      await setMenuItemDeleted(row.id, !row.deleted_at);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  function categoryName(id: string) {
    return categories.find((c) => c.id === id)?.name_en ?? "—";
  }

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">{t("title")}</h2>
        {mode.kind === "list" && categories.length > 0 && (
          <Button variant="glass" size="sm" onClick={() => setMode({ kind: "create" })} className="flex items-center gap-1.5">
            <Plus size={14} /> {t("addItem")}
          </Button>
        )}
      </div>

      {categories.length === 0 && <p className="text-smoke-400 text-sm mb-3">{t("needCategoryFirst")}</p>}

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-400 mb-3">
          {error}
        </p>
      )}

      {mode.kind === "create" && (
        <div className="mb-4">
          <MenuItemForm categories={categories} onDone={() => setMode({ kind: "list" })} />
        </div>
      )}

      <div className="space-y-2">
        {visibleItems.map((item) =>
          mode.kind === "edit" && mode.row.id === item.id ? (
            <div key={item.id} className="mb-2">
              <MenuItemForm categories={categories} initial={item} onDone={() => setMode({ kind: "list" })} />
            </div>
          ) : (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-3 rounded-lg border border-white/5 px-3 py-2 ${item.deleted_at ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-charcoal-800 flex items-center justify-center">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small admin-list thumbnail, no next/image benefit at this size
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageOff size={16} className="text-smoke-400" aria-label={t("noImage")} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-charcoal-100 truncate flex items-center gap-1.5">
                    {item.name_en}
                    {item.is_featured && <Star size={12} className="text-ember-400 shrink-0" aria-hidden="true" />}
                    {item.deleted_at && <span className="text-xs text-red-400">({t("deletedTag")})</span>}
                  </p>
                  <p className="text-xs text-smoke-400 truncate">
                    {categoryName(item.category_id)} · {item.base_price.toFixed(0)} {t("sar")}
                    {!item.is_active && ` · ${t("inactive")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setMode({ kind: "edit", row: item })}
                  aria-label={t("editItem", { name: item.name_en })}
                  className="p-1.5 text-smoke-400 hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleDeleted(item)}
                  aria-label={item.deleted_at ? t("restoreItem", { name: item.name_en }) : t("deleteItem", { name: item.name_en })}
                  className="p-1.5 text-smoke-400 hover:text-red-400"
                >
                  {item.deleted_at ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          )
        )}
        {activeItems.length === 0 && !showDeleted && categories.length > 0 && (
          <p className="text-smoke-400 text-sm">{t("noItems")}</p>
        )}
      </div>

      {deletedItems.length > 0 && (
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-smoke-400 hover:text-charcoal-100 mt-4"
        >
          {showDeleted ? <EyeOff size={12} /> : <Eye size={12} />}
          {showDeleted ? t("hideDeleted") : t("showDeleted", { count: deletedItems.length })}
        </button>
      )}
    </section>
  );
}
