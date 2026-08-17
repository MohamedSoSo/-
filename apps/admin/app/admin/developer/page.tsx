import { createClient } from "@/lib/supabase/server";
import { FeatureFlagRow } from "./FeatureFlagRow";
import { AssetUploader } from "./AssetUploader";
import { ThemeEditor } from "./ThemeEditor";
import { CredentialsPanel, type CredentialStatus } from "./CredentialsPanel";
import { DemoDataPurge } from "./DemoDataPurge";

export const metadata = { title: "Developer Portal — Smart BBQ" };

const BUCKET = "brand-assets";

const ASSET_SLOTS = [
  { key: "logo_primary", label: "Primary Logo" },
  { key: "logo_monochrome", label: "Monochrome Logo" },
  { key: "favicon", label: "Favicon" },
  { key: "hero_bg_customer", label: "Customer Hero Background" },
  { key: "hero_bg_pos", label: "POS Hero Background" },
  { key: "login_bg", label: "Login Background" },
];

const CREDENTIAL_CHECKS: { label: string; envVar: string }[] = [
  { label: "Supabase service role", envVar: "SUPABASE_SERVICE_ROLE_KEY" },
  { label: "ZATCA certificate", envVar: "ZATCA_CERTIFICATE" },
  { label: "ZATCA private key", envVar: "ZATCA_PRIVATE_KEY" },
  { label: "Maps API key", envVar: "NEXT_PUBLIC_MAPS_API_KEY" },
  { label: "Twilio account SID", envVar: "TWILIO_ACCOUNT_SID" },
  { label: "Twilio auth token", envVar: "TWILIO_AUTH_TOKEN" },
  { label: "Payment gateway key", envVar: "PAYMENT_GATEWAY_API_KEY" },
];

export default async function DeveloperPortalPage() {
  const supabase = createClient();

  const [{ data: flags }, { data: assets }, { data: themes }] = await Promise.all([
    supabase.from("feature_flags").select("*").order("key"),
    supabase.from("brand_assets").select("*").order("key"),
    supabase.from("theme_tokens").select("*").order("key"),
  ]);

  const assetByKey = new Map((assets ?? []).map((a) => [a.key, a]));

  const credentialStatuses: CredentialStatus[] = CREDENTIAL_CHECKS.map((c) => ({
    ...c,
    isSet: !!process.env[c.envVar],
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          Developer Portal
        </h1>
        <p className="text-charcoal-100 mt-1">
          Runtime control center — branding, theme, and feature flags across all four apps.
          Changes here never require a code deploy; every write is captured in{" "}
          <code className="text-ember-400">audit_logs</code> via the{" "}
          <code className="text-ember-400">developer</code>-only RLS policies.
        </p>
      </header>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">Feature Flags</h2>
        <div>
          {flags?.map((flag) => (
            <FeatureFlagRow
              key={flag.key}
              flagKey={flag.key}
              description={flag.description}
              rolloutPercentage={flag.rollout_percentage}
              initialEnabled={flag.enabled}
            />
          ))}
          {!flags?.length && <p className="text-smoke-400 text-sm">No feature flags yet.</p>}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">Brand Assets</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASSET_SLOTS.map((slot) => {
            const existing = assetByKey.get(slot.key);
            const publicUrl = existing
              ? supabase.storage.from(BUCKET).getPublicUrl(existing.storage_path).data.publicUrl
              : null;
            return <AssetUploader key={slot.key} assetKey={slot.key} label={slot.label} currentUrl={publicUrl} />;
          })}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">Theme Tokens</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {themes?.map((theme) => (
            <ThemeEditor key={theme.key} appKey={theme.key} tokens={theme.tokens as Record<string, string>} />
          ))}
          {!themes?.length && <p className="text-smoke-400 text-sm">No theme rows yet.</p>}
        </div>
      </section>

      <CredentialsPanel statuses={credentialStatuses} />

      <DemoDataPurge />
    </main>
  );
}
