import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { getMenuData } from "@/lib/menu-data";
import { MenuBrowser } from "@/components/MenuBrowser";
import { TableLock } from "@/components/TableLock";
import { HeroSection } from "@/components/HeroSection";
import { FeaturedSection } from "@/components/FeaturedSection";

export default async function CustomerHome({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const categories = await getMenuData();
  const featuredItems = categories.flatMap((c) => c.items).filter((i) => i.is_featured);

  return (
    <main className="min-h-screen">
      <Suspense>
        <TableLock />
      </Suspense>

      <HeroSection />

      <FeaturedSection items={featuredItems} />

      <MenuBrowser categories={categories} />
    </main>
  );
}
