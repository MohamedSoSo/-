"use client";

import { useState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";

const CONFIRM_PHRASE = "DELETE DEMO DATA";

export function DemoDataPurge() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [isPurging, setIsPurging] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setResult(`Deleted ${data} orders (and their items/payments) placed between ${startDate} and ${endDate}.`);
    setConfirmText("");
  }

  return (
    <section className="glass-panel p-6 border-red-500/20">
      <h2 className="text-xl font-medium mb-1 flex items-center gap-2 text-red-400">
        <Trash2 size={18} /> Demo Data Purge
      </h2>
      <p className="text-sm text-smoke-400 mb-4">
        Permanently deletes every order (and its items, payments, waste, and shift records) placed within the date
        range you choose — no way to distinguish synthetic demo orders from real ones beyond the dates you pick.
        There is no undo. Use this to clear seed data before handing the app to the restaurant owner.
      </p>

      <div className="flex gap-2 mb-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="flex-1 rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
      </div>

      <label className="text-xs text-smoke-400 mb-1 block">
        Type <code className="text-red-400">{CONFIRM_PHRASE}</code> to enable the button
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={CONFIRM_PHRASE}
        className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white mb-3"
      />

      <Button variant="destructive" size="sm" disabled={!canPurge || isPurging} onClick={purge} className="flex items-center gap-1.5">
        <AlertTriangle size={14} /> {isPurging ? "Purging…" : "Permanently delete"}
      </Button>

      {result && <p className="text-xs text-emerald-400 mt-3">{result}</p>}
      {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
    </section>
  );
}
