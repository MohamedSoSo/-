import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@bbq/supabase";

export function createClient() {
  const cookieStore = cookies();
  return createServerSupabaseClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as Record<string, unknown>)
        );
      } catch {
        // Called from a Server Component render — session refresh is handled
        // by middleware.ts instead, this is safe to ignore.
      }
    },
  });
}
