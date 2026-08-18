"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

export function ThemeEditor({ appKey, tokens }: { appKey: string; tokens: Record<string, string> }) {
  const t = useTranslations("themeEditor");
  const router = useRouter();
  const [draft, setDraft] = useState(tokens);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(tokens);

  async function save() {
    setIsSaving(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("theme_tokens")
      .update({ tokens: draft, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("key", appKey);
    setIsSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="rounded-xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-medium text-charcoal-50 capitalize">{appKey}</p>
        <button
          onClick={save}
          disabled={!dirty || isSaving}
          className="flex items-center gap-1.5 text-xs rounded-full border border-white/10 px-3 py-1.5 text-charcoal-100 hover:border-ember-500/40 disabled:opacity-40"
        >
          <Save size={12} /> {isSaving ? t("saving") : saved && !dirty ? t("saved") : t("save")}
        </button>
      </div>
      <div className="space-y-2">
        {Object.entries(draft).map(([token, value]) => (
          <div key={token} className="flex items-center justify-between gap-3">
            <label className="text-xs text-smoke-400">{t.has(`tokens.${token}`) ? t(`tokens.${token}`) : token}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [token]: e.target.value }))}
                className="h-7 w-7 rounded border border-white/10 bg-transparent"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => setDraft((d) => ({ ...d, [token]: e.target.value }))}
                className="w-24 rounded-lg bg-charcoal-800 border border-white/10 px-2 py-1 text-xs text-white"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
