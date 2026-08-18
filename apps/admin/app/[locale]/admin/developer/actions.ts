"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const FeatureFlagInput = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
});

// RLS's feature_flags_developer_write policy is the real authorization
// boundary — this Zod parse is input hygiene, not the security control.
export async function toggleFeatureFlag(input: z.infer<typeof FeatureFlagInput>) {
  const { key, enabled } = FeatureFlagInput.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/developer");
}

const ThemeTokenInput = z.object({
  key: z.string().min(1).max(80),
  tokens: z.record(z.string()),
});

export async function updateThemeTokens(input: z.infer<typeof ThemeTokenInput>) {
  const { key, tokens } = ThemeTokenInput.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("theme_tokens")
    .update({ tokens, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/developer");
}

const BrandAssetInput = z.object({
  key: z.string().min(1).max(80),
  storage_path: z.string().min(1),
  alt_text: z.string().max(200).nullable().optional(),
});

export async function updateBrandAsset(input: z.infer<typeof BrandAssetInput>) {
  const { key, storage_path, alt_text } = BrandAssetInput.parse(input);
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("brand_assets")
    .upsert({
      key,
      storage_path,
      alt_text: alt_text ?? null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/developer");
}
