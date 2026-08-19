"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "brand-assets";
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon"];

export function AssetUploader({
  assetKey,
  label,
  currentUrl,
}: {
  assetKey: string;
  label: string;
  currentUrl: string | null;
}) {
  const t = useTranslations("assetUploader");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
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

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${assetKey}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
      setIsUploading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("brand_assets")
      .upsert({ key: assetKey, storage_path: path, updated_by: user.id, updated_at: new Date().toISOString() });

    setIsUploading(false);
    if (dbError) {
      setError(dbError.message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="rounded-xl border border-white/5 p-4">
      <p className="font-medium text-charcoal-50 mb-2">{label}</p>
      <div className="relative h-24 w-full rounded-lg bg-charcoal-800 overflow-hidden mb-3 flex items-center justify-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded asset, not an optimized local image
          <img src={preview} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-smoke-400">{t("noAsset")}</span>
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
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="w-full flex items-center justify-center gap-1.5 text-sm rounded-lg border border-white/10 py-2 text-charcoal-100 hover:border-ember-500/40 disabled:opacity-50"
      >
        {isUploading ? t("uploading") : <><Upload size={14} /> {currentUrl ? t("replace") : t("upload")}</>}
      </button>
      {error && <p role="alert" aria-live="polite" className="text-xs text-red-400 mt-2">{error}</p>}
      {!isUploading && !error && preview && preview !== currentUrl && (
        <p role="status" aria-live="polite" className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
          <Check size={12} aria-hidden="true" /> {t("saved")}
        </p>
      )}
    </div>
  );
}
