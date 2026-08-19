"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";

export function BottomSheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const tCommon = useTranslations("common");
  const titleId = useId();
  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] rounded-t-2xl border-t border-white/10 bg-charcoal-900 flex flex-col sm:inset-x-auto sm:left-1/2 sm:bottom-8 sm:-translate-x-1/2 sm:w-full sm:max-w-lg sm:rounded-2xl sm:border"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 id={titleId} className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 text-smoke-400 hover:text-white" aria-label={tCommon("close")}>
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-white/10 px-5 py-4">{footer}</div>}
      </motion.div>
    </>
  );
}
