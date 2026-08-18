import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { MaintenanceOverlay } from "@/components/MaintenanceOverlay";
import { getThemeOverrideCss } from "@/lib/theme";
import { createClient } from "@/lib/supabase/server";
import { locales, isLocale } from "@bbq/i18n";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = createClient();
  const [themeCss, userResult, maintenanceFlag, messages] = await Promise.all([
    getThemeOverrideCss("customer"),
    supabase.auth.getUser(),
    supabase.from("feature_flags").select("enabled").eq("key", "maintenance_mode").maybeSingle(),
    getMessages(),
  ]);
  const user = userResult.data.user;
  const isMaintenance = maintenanceFlag.data?.enabled ?? false;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className="dark">
      <head>{themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}</head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {isMaintenance ? (
            <MaintenanceOverlay />
          ) : (
            <>
              <Header isAuthed={!!user} />
              {children}
              <CartDrawer />
            </>
          )}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
