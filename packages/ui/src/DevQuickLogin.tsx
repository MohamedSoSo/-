"use client";

/**
 * DEV-ONLY. Never rendered in production: `process.env.NODE_ENV` is
 * inlined at build time by Next.js, so `next build` dead-code-eliminates
 * this entire branch wherever a caller guards it with the check below —
 * same mechanism React itself uses for its dev-only warnings. Still, every
 * route this links to independently re-checks NODE_ENV server-side before
 * doing anything — this component being absent from a bundle isn't the
 * only thing standing in the way of hitting those endpoints in prod.
 *
 * Buttons are plain cross-origin links (not fetches) so no CORS/CSP
 * connect-src wiring is needed between the 4 apps — a full-page navigation
 * to another localhost port is just a normal link click as far as the
 * browser's concerned.
 */

interface DevRoleLink {
  emoji: string;
  label: string;
  href: string;
}

const LINKS: DevRoleLink[] = [
  { emoji: "👑", label: "Super Developer", href: "http://localhost:3003/api/dev-login?role=developer&next=/admin/developer" },
  { emoji: "👔", label: "Restaurant Owner", href: "http://localhost:3002/api/dev-login?role=owner&next=/" },
  { emoji: "👔", label: "Manager / Supervisor", href: "http://localhost:3001/api/dev-login?role=manager&next=/floor" },
  { emoji: "👨‍🍳", label: "Grill Chef", href: "http://localhost:3001/api/dev-login?role=grill_chef&next=/kds" },
  { emoji: "💳", label: "Cashier", href: "http://localhost:3001/api/dev-login?role=cashier&next=/floor" },
  { emoji: "📱", label: "Customer", href: "http://localhost:3000/api/dev-login?role=customer&next=/" },
];

export function DevQuickLogin() {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] w-72 rounded-2xl border border-yellow-500/30 bg-charcoal-900/95 backdrop-blur-glass p-4 shadow-2xl">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yellow-400 mb-1">Dev Quick Login</p>
      <p className="text-[11px] text-smoke-500 mb-3">
        Local testing only — seeds a real Supabase session per role, bypassing OTP/PIN. Needs
        SUPABASE_SERVICE_ROLE_KEY in .env.local.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-xs text-charcoal-100 hover:border-yellow-500/50 hover:bg-white/5"
          >
            <span>{link.emoji}</span>
            <span className="truncate">{link.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
