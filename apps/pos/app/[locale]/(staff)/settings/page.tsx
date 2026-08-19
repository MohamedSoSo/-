"use client";

import { useEffect, useState } from "react";
import { Printer, Scale as ScaleIcon, RotateCcw, Trash2, ListX } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { registerPrinter, isPrinterRegistered, type PrinterRole } from "@/lib/printing/adapter";
import { useScale } from "@/lib/scale/useScale";
import { getFailedActions, retryFailedAction, discardFailedAction } from "@/lib/offline/queue";
import type { PendingAction } from "@/lib/offline/db";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const [primaryOk, setPrimaryOk] = useState(() => isPrinterRegistered("primary"));
  const [secondaryOk, setSecondaryOk] = useState(() => isPrinterRegistered("secondary"));
  const [error, setError] = useState<string | null>(null);
  const scale = useScale();
  const [failedActions, setFailedActions] = useState<PendingAction[]>([]);

  useEffect(() => {
    getFailedActions().then(setFailedActions);
  }, []);

  async function retry(id: string) {
    await retryFailedAction(id);
    setFailedActions(await getFailedActions());
  }

  async function discard(id: string) {
    await discardFailedAction(id);
    setFailedActions(await getFailedActions());
  }

  async function register(role: PrinterRole) {
    setError(null);
    try {
      if (!navigator.serial) throw new Error(t("printerNotSupported"));
      const port = await navigator.serial.requestPort();
      registerPrinter(role, port);
      if (role === "primary") setPrimaryOk(true);
      else setSecondaryOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("printerError"));
    }
  }

  return (
    <main className="p-4 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-white">{t("hardware")}</h1>

      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
          <Printer size={16} /> {t("receiptPrinters")}
        </h2>
        <p className="text-xs text-smoke-400 mb-3">{t("printerExplain")}</p>
        <div className="flex gap-2">
          <Button variant={primaryOk ? "glass" : "primary"} size="sm" onClick={() => register("primary")}>
            {primaryOk ? t("primaryRegistered") : t("registerPrimary")}
          </Button>
          <Button variant={secondaryOk ? "glass" : "primary"} size="sm" onClick={() => register("secondary")}>
            {secondaryOk ? t("secondaryRegistered") : t("registerSecondary")}
          </Button>
        </div>
      </section>

      <section className="glass-panel p-4">
        <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
          <ScaleIcon size={16} /> {t("electronicScale")}
        </h2>
        {!scale.isSupported ? (
          <p className="text-xs text-red-400">{t("notSupported")}</p>
        ) : (
          <>
            <p className="text-xs text-smoke-400 mb-3">{t("connectOnce")}</p>
            <Button variant={scale.isConnected ? "glass" : "primary"} size="sm" onClick={scale.connect}>
              {scale.isConnected ? t("connected") : t("connectScale")}
            </Button>
            {scale.reading && (
              <p className="text-sm text-ember-400 mt-2">
                {t("liveReading", {
                  kg: (scale.reading.grams / 1000).toFixed(3),
                  status: scale.reading.stable ? t("stable") : t("settling"),
                })}
              </p>
            )}
          </>
        )}
        {scale.error && <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-2">{scale.error}</p>}
      </section>

      {failedActions.length > 0 && (
        <section className="glass-panel p-4 border-red-500/20">
          <h2 className="text-sm font-medium text-red-400 mb-3 flex items-center gap-1.5">
            <ListX size={16} /> {t("failedActions")}
          </h2>
          <p className="text-xs text-smoke-400 mb-3">{t("failedActionsExplain")}</p>
          <div className="space-y-2">
            {failedActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-charcoal-100 capitalize">{action.type.replace("_", " ")}</span>
                  <div className="flex gap-1.5">
                    <Button variant="glass" size="sm" onClick={() => retry(action.id)} aria-label={t("retryAction")}>
                      <RotateCcw size={12} />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => discard(action.id)} aria-label={t("discardAction")}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-red-400">{action.lastError}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && <p role="alert" aria-live="polite" className="text-sm text-red-400">{error}</p>}
    </main>
  );
}
