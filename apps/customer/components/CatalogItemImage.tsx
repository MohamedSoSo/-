"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ASSET_FALLBACKS, ASSET_KEYS } from "@bbq/ui";
import { createClient } from "@/lib/supabase/client";

const CATALOG_IMAGES_BUCKET = "catalog-images";
const PLACEHOLDER = ASSET_FALLBACKS[ASSET_KEYS.menuPlaceholder];

interface CatalogItemImageProps extends Omit<ImageProps, "src"> {
  imagePath: string | null;
}

/**
 * Per-item image (menu_items.image_path, Phase 4) — a direct Storage object
 * path, not a brand_assets/<AppImage /> key, so it's resolved here instead
 * of through that system. Falls back to the same shared placeholder
 * AppImage uses when an item has no image set, or if the real image 404s.
 */
export function CatalogItemImage({ imagePath, alt, ...imageProps }: CatalogItemImageProps) {
  const [src, setSrc] = useState<string>(() => {
    if (!imagePath) return PLACEHOLDER;
    return createClient().storage.from(CATALOG_IMAGES_BUCKET).getPublicUrl(imagePath).data.publicUrl;
  });

  return <Image {...imageProps} src={src} alt={alt} onError={() => setSrc(PLACEHOLDER)} />;
}
