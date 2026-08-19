"use client";

import { useId, useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";

// Exact-match safety confirmation for an irreversible destructive action —
// treat this like a password/fixed code, NOT translatable UI copy. It must
// stay a single literal JS constant, identical in every locale, so a
// developer can't destructively confirm on a stale/wrong-locale phrase
// pasted from a note or a prior session. Never move this into
// messages/en.json or messages/ar.json, and never derive it from t().
const CONFIRM_PHRASE = "DELETE DEMO DATA";

export function DemoDataPurge() {
  const t = useTranslations("demoDataPurge");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startDateId = useId();
  const endDateId = useId();
  const confirmTextId = useId();

  const canPurge = startDate && endDate && confirmText === CONFIRM_PHRASE;

  async function purge() {
    setIsPurging(true);
    setError(null);
    setResult(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("purge_demo_data", {
      p_start_date: startDate,
      p_end_date: endDate,
      p_confirm: confirmText,
    });
    setIsPurging(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setResult(t("result", { count: data, start: startDate, end: endDate }));
    setConfirmText("");
  }

  return (
    <section className="glass-panel p-6 border-red-500/20">
      <h2 className="text-xl font-medium mb-1 flex items-center gap-2 text-red-400">
        <Trash2 size={18} /> {t("title")}
      </h2>
      <p className="text-sm text-smoke-400 mb-4">{t("explain")}</p>

      <div className="flex gap-2 mb-3">
        <label htmlFor={startDateId} className="sr-only">{t("startDateLabel")}</label>
        <input
          id={startDateId}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
        <label htmlFor={endDateId} className="sr-only">{t("endDateLabel")}</label>
        <input
          id={endDateId}
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
      </div>

      <label htmlFor={confirmTextId} className="text-xs text-smoke-400 mb-1 block">
        {t.rich("typePhrase", { phrase: CONFIRM_PHRASE, code: (chunks) => <code className="text-red-400">{chunks}</code> })}
      </label>
      <input
        id={confirmTextId}
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white mb-3"
      />

      <Button variant="destructive" size="sm" disabled={!canPurge || isPurging} onClick={purge} className="flex items-center gap-1.5">
        <AlertTriangle size={14} aria-hidden="true" /> {isPurging ? t("purging") : t("permanentlyDelete")}
      </Button>

      {result && <p role="status" aria-live="polite" className="text-xs text-emerald-400 mt-3">{result}</p>}
      {error && <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-3">{error}</p>}
    </section>
  );
}
