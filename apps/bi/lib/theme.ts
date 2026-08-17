import { createClient } from "./supabase/server";

export async function getThemeOverrideCss(key: string): Promise<string> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("theme_tokens").select("tokens").eq("key", key).maybeSingle();
    const tokens = (data?.tokens ?? {}) as Record<string, string>;
    const entries = Object.entries(tokens);
    if (!entries.length) return "";
    return `:root{${entries.map(([k, v]) => `${k}:${v}`).join(";")}}`;
  } catch {
    return "";
  }
}
