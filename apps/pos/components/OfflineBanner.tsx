"use client";

import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";

export function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, isSyncing } = useOfflineSync();

  if (isOnline && pendingCount === 0 && failedCount === 0) return null;

  if (failedCount > 0) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-center gap-2 py-1.5 text-xs font-medium bg-red-500/20 text-red-300">
        <AlertTriangle size={12} />
        {failedCount} queued action(s) failed and need review — check Settings
      </div>
    );
  }

  return (
    <div
      className={`sticky top-0 z-50 flex items-center justify-center gap-2 py-1.5 text-xs font-medium ${
        isOnline ? "bg-ember-500/20 text-ember-300" : "bg-red-500/20 text-red-300"
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing queued orders…" : `${pendingCount} order(s) waiting to sync`}
        </>
      ) : (
        <>
          <WifiOff size={12} />
          Offline — orders and payments are being queued locally
        </>
      )}
    </div>
  );
}
