import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { DevQuickLogin } from "@bbq/ui";
import { isLocale } from "@bbq/i18n";
import { PhoneAuthForm } from "./PhoneAuthForm";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: `${t("heading")} — Sign in` };
}

export default async function LoginPage({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("login");

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="glass-panel px-8 py-10 max-w-sm w-full">
        <h1 className="text-2xl font-semibold text-center" style={{ color: "var(--brand-accent)" }}>
          {t("heading")}
        </h1>
        <p className="text-center text-sm text-smoke-400 mt-1 mb-6">{t("subtitle")}</p>
        <Suspense>
          <PhoneAuthForm />
        </Suspense>
      </div>
      <DevQuickLogin />
    </main>
  );
}
