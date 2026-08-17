import { DevQuickLogin } from "@bbq/ui";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel px-8 py-10 max-w-sm w-full text-center">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          Sign in
        </h1>
        <p className="text-charcoal-100 mt-2 text-sm">
          Supabase Auth UI (email/password + magic link) wires up in Phase 2.
        </p>
      </div>
      <DevQuickLogin />
    </main>
  );
}
