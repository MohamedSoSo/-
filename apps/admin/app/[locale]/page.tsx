import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { Link } from "@/i18n/navigation";

export default async function AdminHome({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="glass-panel px-8 py-10 max-w-lg">
        <h1 className="text-3xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          {t("heading")}
        </h1>
        <p className="mt-3 text-charcoal-100">
          {t.rich("body", {
            bi: (chunks) => <code className="text-ember-400">{chunks}</code>,
            developer: (chunks) => <code className="text-ember-400">{chunks}</code>,
            link: (chunks) => (
              <Link href="/admin/developer" className="underline text-ember-400">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </main>
  );
}
