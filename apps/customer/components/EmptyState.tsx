import type { ReactNode } from "react";

export function EmptyState({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="h-14 w-14 rounded-full bg-white/5 flex items-center justify-center text-smoke-400 mb-4">
        {icon}
      </div>
      <p className="text-charcoal-100 font-medium">{title}</p>
      {subtitle && <p className="text-smoke-400 text-sm mt-1.5 max-w-xs">{subtitle}</p>}
    </div>
  );
}
