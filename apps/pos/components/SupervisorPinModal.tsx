"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, ShieldAlert } from "lucide-react";
import { PinPad } from "./PinPad";

export function SupervisorPinModal({
  title,
  onApprove,
  onClose,
}: {
  title: string;
  onApprove: (pin: string) => Promise<void>;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePin(pin: string) {
    setError(null);
    setIsSubmitting(true);
    try {
      await onApprove(pin);
      onClose();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-charcoal-900 p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-ember-400">
            <ShieldAlert size={18} />
            <span className="text-sm font-medium">Supervisor approval</span>
          </div>
          <button onClick={onClose} className="text-smoke-400 hover:text-white" aria-label="Cancel">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-charcoal-100 mb-4">{title}</p>
        <PinPad onSubmit={handlePin} isSubmitting={isSubmitting} error={error} />
      </motion.div>
    </>
  );
}

function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  if (message.includes("SUPERVISOR_PIN_INVALID")) return "That PIN isn't authorized to approve this.";
  if (message.includes("ZATCA_LOCKED")) return "This order was already invoiced — issue a credit note instead.";
  if (message.includes("DISCOUNT_EXCEEDS_TOTAL")) return "Discount can't exceed the order total.";
  return "Something went wrong. Please try again.";
}
