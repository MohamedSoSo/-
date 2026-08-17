"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";
import type { IngredientInfo, MenuItemIngredientUsage } from "@/lib/bi-data";
import type { BcgMenuItem } from "@/lib/analytics/bcg";

export function CogsPanel({
  ingredients,
  usage,
  bcgItems,
}: {
  ingredients: IngredientInfo[];
  usage: MenuItemIngredientUsage[];
  bcgItems: BcgMenuItem[];
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const bcgById = new Map(bcgItems.map((i) => [i.menuItemId, i]));

  async function save(ingredientId: string) {
    const draft = drafts[ingredientId];
    if (!draft) return;
    const price = parseFloat(draft);
    if (Number.isNaN(price) || price < 0) return;

    setSaving(ingredientId);
    const supabase = createClient();
    await supabase.from("ingredients").update({ unit_cost_per_kg: price }).eq("id", ingredientId);
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">Supplier prices → live COGS</h3>
      <p className="text-xs text-smoke-500 mb-4">
        Editing a raw price recalculates margin for every menu item that uses it — instantly in this preview, and for
        real once you save.
      </p>

      <div className="space-y-5">
        {ingredients.map((ing) => {
          const draftValue = drafts[ing.id] ?? String(ing.unit_cost_per_kg);
          const draftPrice = parseFloat(draftValue);
          const affected = usage.filter((u) => u.ingredient_id === ing.id);

          return (
            <div key={ing.id} className="border-t border-white/5 pt-4 first:border-0 first:pt-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-white font-medium">{ing.name_en}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-smoke-500">SAR/kg</span>
                  <input
                    type="number"
                    value={draftValue}
                    onChange={(e) => setDrafts((d) => ({ ...d, [ing.id]: e.target.value }))}
                    className="w-24 rounded-lg bg-charcoal-800 border border-white/10 px-2 py-1 text-sm text-white text-right"
                  />
                  <Button variant="glass" size="sm" disabled={saving === ing.id} onClick={() => save(ing.id)}>
                    <Save size={14} />
                  </Button>
                </div>
              </div>

              {affected.length > 0 && !Number.isNaN(draftPrice) && (
                <div className="space-y-1">
                  {affected.map((link) => {
                    const bcgItem = bcgById.get(link.menu_item_id);
                    if (!bcgItem) return null;
                    const newCogsPerUnit = link.kg_per_unit * draftPrice;
                    const avgUnitPrice = bcgItem.unitsSold > 0 ? bcgItem.revenue / bcgItem.unitsSold : 0;
                    const newMargin = avgUnitPrice > 0 ? (avgUnitPrice - newCogsPerUnit) / avgUnitPrice : 0;
                    const marginDelta = newMargin - bcgItem.marginPct;

                    return (
                      <div key={link.menu_item_id} className="flex justify-between text-xs">
                        <span className="text-smoke-400">{bcgItem.name}</span>
                        <span className="tabular-nums">
                          <span className="text-smoke-500">{(bcgItem.marginPct * 100).toFixed(0)}%</span>
                          <span className="text-smoke-600 mx-1">→</span>
                          <span className={marginDelta >= 0 ? "text-emerald-400" : "text-red-400"}>
                            {(newMargin * 100).toFixed(0)}%
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
