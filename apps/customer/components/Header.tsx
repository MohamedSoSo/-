"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ShoppingCart, User } from "lucide-react";
import { AppImage, ASSET_KEYS, LocaleSwitcher } from "@bbq/ui";
import { useCartStore } from "@/lib/cart-store";
import { Link } from "@/i18n/navigation";

export function Header({ isAuthed }: { isAuthed: boolean }) {
  const t = useTranslations("header");
  const items = useCartStore((s) => s.items);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const itemCount = hydrated ? items.reduce((sum, i) => sum + i.quantity, 0) : 0;

  return (
    <header className="sticky top-0 z-40 backdrop-blur-glass bg-charcoal-900/80 border-b border-white/5">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-9 w-9">
            <AppImage assetKey={ASSET_KEYS.logoPrimary} alt="Smart BBQ" fill sizes="36px" className="object-contain" />
          </div>
          <span className="font-semibold text-white tracking-tight">Smart BBQ</span>
        </Link>

        <div className="flex items-center gap-3">
          <LocaleSwitcher />
          <Link
            href={isAuthed ? "/account" : "/login"}
            className="p-2 rounded-full text-charcoal-100 hover:bg-white/5"
            aria-label={t("account")}
          >
            <User size={20} />
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            className="relative p-2 rounded-full text-charcoal-100 hover:bg-white/5"
            aria-label={t("cart")}
          >
            <ShoppingCart size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 h-4 min-w-4 px-1 rounded-full bg-ember-500 text-[10px] font-bold text-charcoal-900 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
