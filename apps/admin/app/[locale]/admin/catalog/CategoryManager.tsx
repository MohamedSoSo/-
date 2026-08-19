"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { upsertCategory, setCategoryDeleted } from "./actions";

export interface CategoryRow {
  id: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  deleted_at: string | null;
}

function CategoryForm({
  initial,
  onDone,
}: {
  initial?: CategoryRow;
  onDone: () => void;
}) {
  const t = useTranslations("catalog.categoryForm");
  const nameEnId = useId();
  const nameArId = useId();
  const [nameEn, setNameEn] = useState(initial?.name_en ?? "");
  const [nameAr, setNameAr] = useState(initial?.name_ar ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    setIsSaving(true);
    try {
      await upsertCategory({
        id: initial?.id,
        name_en: nameEn.trim(),
        name_ar: nameAr.trim(),
        sort_order: initial?.sort_order ?? 0,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="glass-panel p-4 space-y-3">
      <div>
        <label htmlFor={nameEnId} className="text-xs text-smoke-400 block mb-1">
          {t("nameEn")}
        </label>
        <input
          id={nameEnId}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
      </div>
      <div>
        <label htmlFor={nameArId} className="text-xs text-smoke-400 block mb-1">
          {t("nameAr")}
        </label>
        <input
          id={nameArId}
          dir="rtl"
          value={nameAr}
          onChange={(e) => setNameAr(e.target.value)}
          className="w-full rounded-lg bg-charcoal-800 border border-white/10 px-3 py-2 text-sm text-white"
        />
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button variant="primary" size="sm" disabled={isSaving || !nameEn.trim() || !nameAr.trim()} onClick={save}>
          {isSaving ? t("saving") : t("save")}
        </Button>
        <Button variant="glass" size="sm" onClick={onDone}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const t = useTranslations("catalog.categoryManager");
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: "list" } | { kind: "create" } | { kind: "edit"; row: CategoryRow }>({
    kind: "list",
  });
  const [error, setError] = useState<string | null>(null);

  async function toggleDeleted(row: CategoryRow) {
    setError(null);
    try {
      await setCategoryDeleted(row.id, !row.deleted_at);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("actionFailed"));
    }
  }

  return (
    <section className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">{t("title")}</h2>
        {mode.kind === "list" && (
          <Button variant="glass" size="sm" onClick={() => setMode({ kind: "create" })} className="flex items-center gap-1.5">
            <Plus size={14} /> {t("addCategory")}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-red-400 mb-3">
          {error}
        </p>
      )}

      {mode.kind === "create" && (
        <div className="mb-4">
          <CategoryForm onDone={() => setMode({ kind: "list" })} />
        </div>
      )}

      <div className="space-y-2">
        {categories.map((c) =>
          mode.kind === "edit" && mode.row.id === c.id ? (
            <div key={c.id} className="mb-2">
              <CategoryForm initial={c} onDone={() => setMode({ kind: "list" })} />
            </div>
          ) : (
            <div
              key={c.id}
              className={`flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 ${c.deleted_at ? "opacity-50" : ""}`}
            >
              <div>
                <p className="text-sm text-charcoal-100">{c.name_en}</p>
                <p className="text-xs text-smoke-400" dir="rtl">
                  {c.name_ar}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMode({ kind: "edit", row: c })}
                  aria-label={t("editCategory", { name: c.name_en })}
                  className="p-1.5 text-smoke-400 hover:text-white"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => toggleDeleted(c)}
                  aria-label={c.deleted_at ? t("restoreCategory", { name: c.name_en }) : t("deleteCategory", { name: c.name_en })}
                  className="p-1.5 text-smoke-400 hover:text-red-400"
                >
                  {c.deleted_at ? <RotateCcw size={14} /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          )
        )}
        {categories.length === 0 && <p className="text-smoke-400 text-sm">{t("noCategories")}</p>}
      </div>
    </section>
  );
}
