"use client";

import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";

export type FeatureFlags = Record<string, boolean>;

/**
 * Reads feature_flags (Developer Portal-managed, see apps/admin/app/admin/developer)
 * and stays live via Realtime — toggling a flag in the portal updates every
 * open customer session with no redeploy and no page reload.
 */
export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      const { data } = await supabase.from("feature_flags").select("key, enabled");
      if (cancelled) return;
      setFlags(Object.fromEntries((data ?? []).map((f) => [f.key, f.enabled])));
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("feature_flags_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feature_flags" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { key: string; enabled: boolean } | null;
          if (!row) return;
          setFlags((prev) => ({ ...prev, [row.key]: row.enabled }));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { flags, loading, isEnabled: (key: string) => flags[key] ?? false };
}
