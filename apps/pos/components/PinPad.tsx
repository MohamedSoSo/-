"use client";

import { useState } from "react";
import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PinPad({
  onSubmit,
  isSubmitting,
  error,
  maxLength = 6,
}: {
  onSubmit: (pin: string) => void;
  isSubmitting?: boolean;
  error?: string | null;
  maxLength?: number;
}) {
  const [pin, setPin] = useState("");

  function press(key: string) {
    if (isSubmitting || key === "") return;
    if (key === "⌫") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => (p + key).slice(0, maxLength));
  }

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex justify-center gap-3 mb-6" aria-hidden="true">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < pin.length ? "bg-ember-500 border-ember-500" : "border-white/20"
            }`}
          />
        ))}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {pin.length} of {maxLength} digits entered
      </p>

      {error && (
        <p role="alert" aria-live="polite" className="text-center text-sm text-red-400 mb-4">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === "" || isSubmitting}
            aria-label={key === "⌫" ? "Backspace" : undefined}
            onClick={() => press(key)}
            className="h-16 rounded-2xl bg-white/5 text-2xl font-medium text-white hover:bg-white/10 disabled:opacity-0 flex items-center justify-center"
          >
            {key === "⌫" ? <Delete size={22} /> : key}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={pin.length < 4 || isSubmitting}
        onClick={() => onSubmit(pin)}
        className="w-full mt-4 h-14 rounded-2xl bg-ember-500 text-charcoal-900 font-semibold disabled:opacity-40"
      >
        {isSubmitting ? "Checking…" : "Enter"}
      </button>
    </div>
  );
}
