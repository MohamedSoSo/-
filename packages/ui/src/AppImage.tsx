"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@bbq/supabase";
import { ASSET_FALLBACKS, BRAND_ASSETS_BUCKET, type AssetKey } from "./assets.config";

interface AppImageProps extends Omit<ImageProps, "src"> {
  assetKey: AssetKey;
}

/**
 * Resolves `assetKey` against the `brand_assets` table (Developer Portal
 * managed) -> Supabase Storage public URL, with WebP-served storage +
 * automatic fallback to the bundled local asset on miss/error.
 */
export function AppImage({ assetKey, alt, ...imageProps }: AppImageProps) {
  const [src, setSrc] = useState<string>(ASSET_FALLBACKS[assetKey]);
  const [resolvedAlt, setResolvedAlt] = useState(alt);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data, error } = await supabase
          .from("brand_assets")
          .select("storage_path, alt_text")
          .eq("key", assetKey)
          .maybeSingle();

        if (cancelled || error || !data) return;

        const { data: publicUrl } = supabase.storage.from(BRAND_ASSETS_BUCKET).getPublicUrl(data.storage_path);

        if (!cancelled && publicUrl?.publicUrl) {
          setSrc(publicUrl.publicUrl);
          if (!alt && data.alt_text) setResolvedAlt(data.alt_text);
        }
      } catch {
        // network/config issue — keep the local fallback, no user-facing error
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [assetKey, alt]);

  return (
    <Image
      {...imageProps}
      src={src}
      alt={resolvedAlt ?? ""}
      onError={() => setSrc(ASSET_FALLBACKS[assetKey])}
    />
  );
}
