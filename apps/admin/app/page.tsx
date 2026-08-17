import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="glass-panel px-8 py-10 max-w-lg">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          Admin
        </h1>
        <p className="mt-3 text-charcoal-100">
          Owner BI links to the <code className="text-ember-400">bi</code> app. The hidden
          technical control center lives at{" "}
          <Link href="/admin/developer" className="underline text-ember-400">
            /admin/developer
          </Link>{" "}
          — restricted to the <code className="text-ember-400">developer</code> role.
        </p>
      </div>
    </main>
  );
}
