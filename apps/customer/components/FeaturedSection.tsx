"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { localizedField, localizedFieldNullable, type Locale } from "@bbq/i18n";
import type { MenuItemView } from "@/lib/menu-data";
import { CatalogItemImage } from "./CatalogItemImage";
import { ItemCustomizeSheet } from "./ItemCustomizeSheet";
import { ComboBuilderSheet } from "./ComboBuilderSheet";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

// Reduced-motion handling is centralized in <MotionProvider> — see that
// file for why manual useReducedMotion() conditionals aren't used here.
export function FeaturedSection({ items }: { items: MenuItemView[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("home");
  const tMenu = useTranslations("menu");
  const tCommon = useTranslations("common");
  const [openItem, setOpenItem] = useState<MenuItemView | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 pt-8">
      <h2 className="flex items-center gap-1.5 text-lg font-semibold text-white mb-4">
        <Sparkles size={18} className="text-ember-400" aria-hidden="true" />
        {t("featuredTitle")}
      </h2>
      <motion.div
        className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {items.map((item) => {
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
              className="text-start glass-panel overflow-hidden border-ember-500/25 hover:border-ember-500/50 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0 w-64 sm:w-auto"
            >
              <div className="relative h-32 w-full bg-charcoal-800">
                <CatalogItemImage
                  imagePath={item.image_path}
                  alt={name}
                  fill
                  sizes="(max-width: 640px) 256px, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-charcoal-900/70 to-transparent" />
              </div>
              <div className="p-3">
                <p className="font-medium text-white text-sm">{name}</p>
                {description && <p className="text-xs text-smoke-400 mt-1 line-clamp-1">{description}</p>}
                <p className="text-ember-400 font-semibold text-sm mt-1.5">
                  {item.is_weight_based
                    ? tMenu("priceFrom", { price: (item.base_price * (item.weight_tiers[0]?.price_multiplier ?? 1)).toFixed(0) })
                    : `${item.base_price.toFixed(0)} ${tCommon("sar")}`}
                </p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {openItem?.item_type === "combo" ? (
        <ComboBuilderSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : openItem ? (
        <ItemCustomizeSheet item={openItem} onClose={() => setOpenItem(null)} />
      ) : null}
    </div>
  );
}
