"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, ChefHat, Wallet, Settings } from "lucide-react";
import { LocaleSwitcher } from "@bbq/ui";
import { usePosSession } from "@/lib/pos-session";
import { Link } from "@/i18n/navigation";

export function StaffHeader() {
  const t = useTranslations("staffHeader");
  const pathname = usePathname();
  const operator = usePosSession((s) => s.operator);

  const NAV = [
    { href: "/floor", label: t("floor"), icon: LayoutGrid },
    { href: "/kds", label: t("kitchen"), icon: ChefHat },
    { href: "/shifts", label: t("shift"), icon: Wallet },
    { href: "/settings", label: t("hardware"), icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-charcoal-900/95 backdrop-blur-glass border-b border-white/5">
      <nav className="flex gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              pathname?.includes(href) ? "bg-ember-500 text-charcoal-900 font-medium" : "text-charcoal-100 hover:bg-white/5"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <LocaleSwitcher />
        <span className="text-sm text-smoke-400">{operator?.displayName}</span>
      </div>
    </header>
  );
}
