import { CheckCircle2, XCircle } from "lucide-react";

export interface CredentialStatus {
  label: string;
  envVar: string;
  isSet: boolean;
}

/**
 * Read-only status, deliberately. Secrets live in environment variables /
 * your hosting provider's secret manager, never in a database table — even
 * gated by RLS to developer-only, a Postgres table reachable via PostgREST
 * is a bigger blast radius than server-only env vars if RLS is ever
 * misconfigured or the anon key leaks. This panel tells you WHAT's
 * configured, not a form to type secrets into the app.
 */
export function CredentialsPanel({ statuses }: { statuses: CredentialStatus[] }) {
  return (
    <section className="glass-panel p-6">
      <h2 className="text-xl font-medium mb-1">API Credentials</h2>
      <p className="text-sm text-smoke-400 mb-4">
        Status only — set these in each app's <code className="text-ember-400">.env.local</code> (or your hosting
        provider's environment variables in production), never in the database.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {statuses.map((s) => (
          <div key={s.envVar} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2">
            <div>
              <p className="text-sm text-charcoal-100">{s.label}</p>
              <p className="text-xs text-smoke-500 font-mono">{s.envVar}</p>
            </div>
            {s.isSet ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> Configured
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-smoke-500">
                <XCircle size={14} /> Not set
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
