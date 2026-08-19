"use client";

import { useRef, useState } from "react";
import { Upload, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { updateMenuItemImage } from "./actions";

const BUCKET = "catalog-images";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export function CatalogImageUploader({
  itemId,
  label,
  currentUrl,
}: {
  itemId: string;
  label: string;
  currentUrl: string | null;
}) {
  const t = useTranslations("catalog.imageUploader");
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFile(file: File) {
    setError(null);
    setSaved(false);
    if (!ACCEPTED.includes(file.type)) {
      setError(t("invalidType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("tooLarge"));
      return;
    }

    setIsUploading(true);
    setPreview(URL.createObjectURL(file));

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t("notSignedIn"));
      setIsUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `menu-items/${itemId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    try {
      await updateMenuItemImage(itemId, path);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("notSignedIn"));
      setIsUploading(false);
      return;
    }

    setIsUploading(false);
    setSaved(true);
  }

  return (
    <div className="rounded-xl border border-white/5 p-3">
      <p className="text-xs text-smoke-400 mb-2">{label}</p>
      <div className="relative h-20 w-full rounded-lg bg-charcoal-800 overflow-hidden mb-2 flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded catalog image, not an optimized local image
          <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-smoke-400">{t("noImage")}</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        aria-label={label}
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-1.5 text-xs rounded-lg border border-white/10 py-1.5 text-charcoal-100 hover:border-ember-500/40 disabled:opacity-50"
      >
        {isUploading ? t("uploading") : <><Upload size={12} /> {currentUrl || preview ? t("replace") : t("upload")}</>}
      </button>
      {error && (
        <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-1.5">
          {error}
        </p>
      )}
      {saved && !isUploading && !error && (
        <p role="status" aria-live="polite" className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
          <Check size={12} aria-hidden="true" /> {t("saved")}
        </p>
      )}
    </div>
  );
}
