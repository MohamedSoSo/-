import { createClient } from "./supabase/server";

// Reads the Developer Portal's theme_tokens row for this app (see
// apps/admin/app/admin/developer) and returns it as inline CSS custom
// properties. Falls back to nothing (globals.css's static :root values win)
// if no row exists yet or the query fails.
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
