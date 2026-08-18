"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toggleFeatureFlag } from "./actions";

interface Props {
  flagKey: string;
  description: string | null;
  rolloutPercentage: number;
  initialEnabled: boolean;
}

export function FeatureFlagRow({ flagKey, description, rolloutPercentage, initialEnabled }: Props) {
  const isRtl = useLocale() === "ar";
  const t = useTranslations("featureFlagRow");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    const next = !enabled;
    setEnabled(next); // optimistic
    setError(null);
    startTransition(async () => {
      try {
        await toggleFeatureFlag({ key: flagKey, enabled: next });
      } catch (e) {
        setEnabled(!next); // revert on failure
        setError(e instanceof Error ? e.message : t("updateFailed"));
      }
    });
  }

  const onTranslate = isRtl ? "-translate-x-6" : "translate-x-6";
  const offTranslate = isRtl ? "-translate-x-1" : "translate-x-1";

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-white/5 last:border-0">
      <div>
        <p className="font-medium text-charcoal-50">{flagKey}</p>
        {description && <p className="text-sm text-smoke-400">{description}</p>}
        {rolloutPercentage < 100 && (
          <p className="text-xs text-ember-400 mt-0.5">{t("rollout", { pct: rolloutPercentage })}</p>
        )}
        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
      </div>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={enabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
          enabled ? "bg-ember-500" : "bg-charcoal-600"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
            enabled ? onTranslate : offTranslate
          }`}
        />
      </button>
    </div>
  );
}
