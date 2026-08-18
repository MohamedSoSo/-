import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/server";
import { FeatureFlagRow } from "./FeatureFlagRow";
import { AssetUploader } from "./AssetUploader";
import { ThemeEditor } from "./ThemeEditor";
import { CredentialsPanel, type CredentialStatus } from "./CredentialsPanel";
import { DemoDataPurge } from "./DemoDataPurge";

const BUCKET = "brand-assets";

const ASSET_SLOTS = [
  "logo_primary",
  "logo_monochrome",
  "favicon",
  "hero_bg_customer",
  "hero_bg_pos",
  "login_bg",
] as const;

const CREDENTIAL_CHECKS: { labelKey: string; envVar: string }[] = [
  { labelKey: "supabaseServiceRole", envVar: "SUPABASE_SERVICE_ROLE_KEY" },
  { labelKey: "zatcaCertificate", envVar: "ZATCA_CERTIFICATE" },
  { labelKey: "zatcaPrivateKey", envVar: "ZATCA_PRIVATE_KEY" },
  { labelKey: "mapsApiKey", envVar: "NEXT_PUBLIC_MAPS_API_KEY" },
  { labelKey: "twilioAccountSid", envVar: "TWILIO_ACCOUNT_SID" },
  { labelKey: "twilioAuthToken", envVar: "TWILIO_AUTH_TOKEN" },
  { labelKey: "paymentGatewayKey", envVar: "PAYMENT_GATEWAY_API_KEY" },
];

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "developerPortal" });
  return { title: `${t("title")} — Smart BBQ` };
}

export default async function DeveloperPortalPage({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = createClient();
  const t = await getTranslations("developerPortal");
  const tCredentials = await getTranslations("credentialsPanel");

  const [{ data: flags }, { data: assets }, { data: themes }] = await Promise.all([
    supabase.from("feature_flags").select("*").order("key"),
    supabase.from("brand_assets").select("*").order("key"),
    supabase.from("theme_tokens").select("*").order("key"),
  ]);

  const assetByKey = new Map((assets ?? []).map((a) => [a.key, a]));

  const credentialStatuses: CredentialStatus[] = CREDENTIAL_CHECKS.map((c) => ({
    label: tCredentials(`checks.${c.labelKey}`),
    envVar: c.envVar,
    isSet: !!process.env[c.envVar],
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto space-y-10">
      <header>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          {t("title")}
        </h1>
        <p className="text-charcoal-100 mt-1">
          {t.rich("subtitle", {
            auditLogs: (chunks) => <code className="text-ember-400">{chunks}</code>,
            developer: (chunks) => <code className="text-ember-400">{chunks}</code>,
          })}
        </p>
      </header>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">{t("featureFlags")}</h2>
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
          {!flags?.length && <p className="text-smoke-400 text-sm">{t("noFlags")}</p>}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">{t("brandAssets")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ASSET_SLOTS.map((slotKey) => {
            const existing = assetByKey.get(slotKey);
            const publicUrl = existing
              ? supabase.storage.from(BUCKET).getPublicUrl(existing.storage_path).data.publicUrl
              : null;
            return (
              <AssetUploader
                key={slotKey}
                assetKey={slotKey}
                label={t(`assetSlots.${slotKey}`)}
                currentUrl={publicUrl}
              />
            );
          })}
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-xl font-medium mb-4">{t("themeTokens")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {themes?.map((theme) => (
            <ThemeEditor key={theme.key} appKey={theme.key} tokens={theme.tokens as Record<string, string>} />
          ))}
          {!themes?.length && <p className="text-smoke-400 text-sm">{t("noThemeRows")}</p>}
        </div>
      </section>

      <CredentialsPanel statuses={credentialStatuses} />

      <DemoDataPurge />
    </main>
  );
}
