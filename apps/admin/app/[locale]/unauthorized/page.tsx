import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/server";

export default async function UnauthorizedPage({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = createClient();
  const t = await getTranslations("unauthorized");
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
        <h1 className="text-2xl font-semibold text-red-400">{t("title")}</h1>
        <p className="text-charcoal-100 mt-2 text-sm">
          {t.rich("restrictedTo", { code: (chunks) => <code className="text-ember-400">{chunks}</code> })}
        </p>
        {currentRole && (
          <p className="text-smoke-400 mt-3 text-xs">
            {t.rich("currentlySignedInAs", {
              role: currentRole,
              code: (chunks) => <code className="text-ember-400">{chunks}</code>,
            })}
          </p>
        )}
        {process.env.NODE_ENV === "development" && (
          <a
            href={`/api/dev-login?role=developer&next=/${locale}/admin/developer`}
            className="mt-6 inline-block rounded-full bg-ember-500 text-charcoal-900 font-medium px-5 py-2 text-sm"
          >
            {t("signInAsDeveloper")}
          </a>
        )}
      </div>
    </main>
  );
}
