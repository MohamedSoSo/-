import { createClient } from "@/lib/supabase/server";

export default async function UnauthorizedPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let currentRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    currentRole = profile?.role ?? null;
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel px-8 py-10 max-w-sm w-full text-center">
        <h1 className="text-2xl font-semibold text-red-400">Access denied</h1>
        <p className="text-charcoal-100 mt-2 text-sm">
          The Developer Portal is restricted to the <code className="text-ember-400">developer</code> role.
        </p>
        {currentRole && (
          <p className="text-smoke-400 mt-3 text-xs">
            You're currently signed in as <code className="text-ember-400">{currentRole}</code> — on localhost,
            dev sessions are shared across every Smart BBQ app's port, so signing into another app (POS, Customer…)
            first carries that role over here.
          </p>
        )}
        {process.env.NODE_ENV === "development" && (
          <a
            href="/api/dev-login?role=developer&next=/admin/developer"
            className="mt-6 inline-block rounded-full bg-ember-500 text-charcoal-900 font-medium px-5 py-2 text-sm"
          >
            Sign in as Developer (dev only)
          </a>
        )}
      </div>
    </main>
  );
}
