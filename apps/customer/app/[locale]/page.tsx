import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppImage, ASSET_KEYS } from "@bbq/ui";
import { isLocale } from "@bbq/i18n";
import { getMenuData } from "@/lib/menu-data";
import { MenuBrowser } from "@/components/MenuBrowser";
import { TableLock } from "@/components/TableLock";

export default async function CustomerHome({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const [categories, t] = await Promise.all([getMenuData(), getTranslations("home")]);

  return (
    <main className="min-h-screen">
      <Suspense>
        <TableLock />
      </Suspense>

      <div className="relative h-56 sm:h-72">
        <AppImage
          assetKey={ASSET_KEYS.heroBgCustomer}
          alt="Smart BBQ"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/40 to-transparent" />
        <div className="absolute bottom-4 inset-x-0 text-center px-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">{t("heroTitle")}</h1>
          <p className="text-charcoal-100 text-sm mt-1">{t("heroSubtitle")}</p>
        </div>
      </div>

      <MenuBrowser categories={categories} />
    </main>
  );
}
