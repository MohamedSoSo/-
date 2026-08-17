import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatTile({
  label,
  value,
  deltaPct,
  deltaIsGoodWhenPositive = true,
  icon,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  deltaIsGoodWhenPositive?: boolean;
  icon?: ReactNode;
}) {
  const hasDelta = deltaPct != null && Number.isFinite(deltaPct);
  const isGood = hasDelta && (deltaIsGoodWhenPositive ? deltaPct! > 0 : deltaPct! < 0);
  const isBad = hasDelta && (deltaIsGoodWhenPositive ? deltaPct! < 0 : deltaPct! > 0);

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-smoke-400">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      {hasDelta && Math.abs(deltaPct!) >= 0.5 && (
        <p className={`text-xs flex items-center gap-1 mt-1 ${isGood ? "text-emerald-400" : isBad ? "text-red-400" : "text-smoke-400"}`}>
          {deltaPct! > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(deltaPct!).toFixed(1)}% vs. prior period
        </p>
      )}
    </div>
  );
}
