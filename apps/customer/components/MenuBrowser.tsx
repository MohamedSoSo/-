"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AppImage, ASSET_KEYS } from "@bbq/ui";
import { localizedField, localizedFieldNullable, type Locale } from "@bbq/i18n";
import type { MenuCategoryView, MenuItemView } from "@/lib/menu-data";
import { ItemCustomizeSheet } from "./ItemCustomizeSheet";
import { ComboBuilderSheet } from "./ComboBuilderSheet";

export function MenuBrowser({ categories }: { categories: MenuCategoryView[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("menu");
  const tCommon = useTranslations("common");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [openItem, setOpenItem] = useState<MenuItemView | null>(null);

  const active = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <div className="max-w-5xl mx-auto px-4 pb-24">
      <div className="flex gap-2 overflow-x-auto py-4 sticky top-[57px] z-30 bg-charcoal-900/95 backdrop-blur-glass">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              c.id === active?.id ? "bg-ember-500 text-charcoal-900" : "bg-white/5 text-charcoal-100"
            }`}
          >
            {localizedField(c.name_en, c.name_ar, locale)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mt-2">
        {active?.items.map((item) => {
          const name = localizedField(item.name_en, item.name_ar, locale);
          const description = localizedFieldNullable(item.description_en, item.description_ar, locale);
          return (
            <button
              key={item.id}
              onClick={() => setOpenItem(item)}
              disabled={!item.is_weight_based && item.stock_quantity === 0}
              className="text-start glass-panel overflow-hidden hover:border-ember-500/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <div className="relative h-40 w-full bg-charcoal-800">
                <AppImage
                  assetKey={ASSET_KEYS.menuPlaceholder}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <p className="font-medium text-white">{name}</p>
                {description && <p className="text-sm text-smoke-400 mt-1 line-clamp-2">{description}</p>}
                <p className="text-ember-400 font-semibold mt-2">
                  {item.is_weight_based
                    ? t("priceFrom", { price: (item.base_price * (item.weight_tiers[0]?.price_multiplier ?? 1)).toFixed(0) })
                    : `${item.base_price.toFixed(0)} ${tCommon("sar")}`}
                </p>
                {!item.is_weight_based && item.stock_quantity === 0 && (
                  <p className="text-xs text-red-400 mt-1">{t("soldOut")}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openItem?.item_type === "combo" ? (
        <ComboBuilderSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : openItem ? (
        <ItemCustomizeSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : null}
    </div>
  );
}
