"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ChefHat, Wallet, Settings } from "lucide-react";
import { usePosSession } from "@/lib/pos-session";

const NAV = [
  { href: "/floor", label: "Floor", icon: LayoutGrid },
  { href: "/kds", label: "Kitchen", icon: ChefHat },
  { href: "/shifts", label: "Shift", icon: Wallet },
  { href: "/settings", label: "Hardware", icon: Settings },
];

export function StaffHeader() {
  const pathname = usePathname();
  const operator = usePosSession((s) => s.operator);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 bg-charcoal-900/95 backdrop-blur-glass border-b border-white/5">
      <nav className="flex gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              pathname?.startsWith(href) ? "bg-ember-500 text-charcoal-900 font-medium" : "text-charcoal-100 hover:bg-white/5"
            }`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
      <span className="text-sm text-smoke-400">{operator?.displayName}</span>
    </header>
  );
}
