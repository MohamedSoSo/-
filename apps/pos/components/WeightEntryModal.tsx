"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Scale as ScaleIcon, Keyboard } from "lucide-react";
import { Button } from "@bbq/ui";
import { useScale } from "@/lib/scale/useScale";

/**
 * Records the actual cooked weight of a grill item before it's marked
 * ready — this is what feeds yield/meat-loss tracking in the Owner BI
 * dashboard (Phase 4), not checkout-time pricing (which stays tier-based
 * per the Phase 2 weight_tiers model). Scale-assisted with mandatory
 * manual-entry + reason failover if the scale is unavailable or disconnects.
 */
export function WeightEntryModal({
  itemLabel,
  orderedGrams,
  onSubmit,
  onClose,
}: {
  itemLabel: string;
  orderedGrams: number | null;
  onSubmit: (grams: number, manualReason: string | null) => void;
  onClose: () => void;
}) {
  const scale = useScale();
  const [manualGrams, setManualGrams] = useState("");
  const [manualReason, setManualReason] = useState("");
  const [mode, setMode] = useState<"scale" | "manual">("scale");

  const canSubmitScale = scale.isConnected && scale.reading?.stable && !scale.isStale;
  const canSubmitManual = manualGrams && manualReason.trim().length > 0;

  return (
    <>
      <motion.div className="fixed inset-0 z-50 bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />
      <motion.div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-charcoal-900 p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-white">{itemLabel}</p>
          <button onClick={onClose} className="text-smoke-400 hover:text-white" aria-label="Cancel">
            <X size={18} />
          </button>
        </div>

        {orderedGrams && <p className="text-xs text-smoke-400 mb-4">Ordered: {orderedGrams}g</p>}

        <div className="flex rounded-full border border-white/10 p-1 mb-4">
          <button
            onClick={() => setMode("scale")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs ${mode === "scale" ? "bg-ember-500 text-charcoal-900 font-medium" : "text-smoke-400"}`}
          >
            <ScaleIcon size={13} /> Scale
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-1.5 text-xs ${mode === "manual" ? "bg-ember-500 text-charcoal-900 font-medium" : "text-smoke-400"}`}
          >
            <Keyboard size={13} /> Manual
          </button>
        </div>

        {mode === "scale" ? (
          <div>
            {!scale.isConnected ? (
              <Button variant="glass" size="sm" className="w-full" onClick={scale.connect}>
                Connect scale
              </Button>
            ) : (
              <p className="text-center text-2xl font-semibold text-white mb-2">
                {scale.reading ? `${(scale.reading.grams / 1000).toFixed(3)} kg` : "Waiting for reading…"}
                {scale.reading && !scale.reading.stable && !scale.isStale && (
                  <span className="block text-xs text-yellow-400 font-normal">settling…</span>
                )}
                {scale.isStale && (
                  <span className="block text-xs text-red-400 font-normal">
                    No signal from scale — it may have disconnected. Switch to manual entry.
                  </span>
                )}
              </p>
            )}
            {scale.error && <p className="text-xs text-red-400 mb-2">{scale.error} — switch to manual entry.</p>}
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-2"
              disabled={!canSubmitScale}
              onClick={() => scale.reading && onSubmit(scale.reading.grams, null)}
            >
              Confirm weight
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="number"
              autoFocus
              placeholder="Weight in grams"
              value={manualGrams}
              onChange={(e) => setManualGrams(e.target.value)}
              className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Reason (scale unavailable, disconnected...)"
              value={manualReason}
              onChange={(e) => setManualReason(e.target.value)}
              className="w-full rounded-xl2 bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
            />
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canSubmitManual}
              onClick={() => onSubmit(parseInt(manualGrams, 10), manualReason.trim())}
            >
              Confirm weight
            </Button>
          </div>
        )}
      </motion.div>
    </>
  );
}
