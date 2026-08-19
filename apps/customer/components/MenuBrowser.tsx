"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedField, localizedFieldNullable, type Locale } from "@bbq/i18n";
import type { MenuCategoryView, MenuItemView } from "@/lib/menu-data";
import { ItemCustomizeSheet } from "./ItemCustomizeSheet";
import { ComboBuilderSheet } from "./ComboBuilderSheet";
import { EmptyState } from "./EmptyState";
import { CatalogItemImage } from "./CatalogItemImage";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0 },
};

// Reduced-motion handling is centralized in <MotionProvider> (MotionConfig
// reducedMotion="user") in the root layout — see that file for why manual
// useReducedMotion() conditionals aren't used here.
export function MenuBrowser({ categories }: { categories: MenuCategoryView[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("menu");
  const tCommon = useTranslations("common");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id);
  const [openItem, setOpenItem] = useState<MenuItemView | null>(null);

  const active = categories.find((c) => c.id === activeCategory) ?? categories[0];

  return (
    <div id="menu" className="max-w-5xl mx-auto px-4 pb-24 scroll-mt-14">
      <div
        role="radiogroup"
        aria-label={t("categoriesLabel")}
        className="flex gap-2 overflow-x-auto py-4 sticky top-[57px] z-30 bg-charcoal-900/95 backdrop-blur-glass"
      >
        {categories.map((c) => (
          <button
            key={c.id}
            role="radio"
            aria-checked={c.id === active?.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              c.id === active?.id ? "bg-ember-500 text-charcoal-900" : "bg-white/5 text-charcoal-100"
            }`}
          >
            {localizedField(c.name_en, c.name_ar, locale)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {active && active.items.length === 0 ? (
          <motion.div
            key={`${active.id}-empty`}
            data-animate
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <EmptyState
              icon={<UtensilsCrossed size={22} />}
              title={t("emptyCategoryTitle")}
              subtitle={t("emptyCategorySubtitle")}
            />
          </motion.div>
        ) : (
          <motion.div
            key={active?.id}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-2"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={gridVariants}
          >
            {active?.items.map((item) => {
              const name = localizedField(item.name_en, item.name_ar, locale);
              const description = localizedFieldNullable(item.description_en, item.description_ar, locale);
              return (
                <motion.button
                  key={item.id}
                  data-animate
                  variants={cardVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOpenItem(item)}
                  disabled={!item.is_weight_based && item.stock_quantity === 0}
                  className="text-start glass-panel overflow-hidden hover:border-ember-500/40 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <div className="relative h-36 w-full bg-charcoal-800">
                    <CatalogItemImage
                      imagePath={item.image_path}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
                    <span
                      aria-hidden="true"
                      className="absolute bottom-2 end-2 rounded-full bg-charcoal-900/85 backdrop-blur-glass border border-white/10 px-2.5 py-1 text-xs font-semibold text-ember-400"
                    >
                      {item.is_weight_based
                        ? t("priceFrom", { price: (item.base_price * (item.weight_tiers[0]?.price_multiplier ?? 1)).toFixed(0) })
                        : `${item.base_price.toFixed(0)} ${tCommon("sar")}`}
                    </span>
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
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {openItem?.item_type === "combo" ? (
        <ComboBuilderSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : openItem ? (
        <ItemCustomizeSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : null}
    </div>
  );
}
