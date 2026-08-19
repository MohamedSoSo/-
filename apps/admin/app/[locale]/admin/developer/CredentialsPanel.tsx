import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("credentialsPanel");
  return (
    <section className="glass-panel p-6">
      <h2 className="text-xl font-medium mb-1">{t("title")}</h2>
      <p className="text-sm text-smoke-400 mb-4">
        {t.rich("subtitle", { envLocal: (chunks) => <code className="text-ember-400">{chunks}</code> })}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {statuses.map((s) => (
          <div key={s.envVar} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2">
            <div>
              <p className="text-sm text-charcoal-100">{s.label}</p>
              <p className="text-xs text-smoke-400 font-mono">{s.envVar}</p>
            </div>
            {s.isSet ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> {t("configured")}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-smoke-400">
                <XCircle size={14} /> {t("notSet")}
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
