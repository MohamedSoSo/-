import { Suspense } from "react";
import { AppImage, ASSET_KEYS } from "@bbq/ui";
import { getMenuData } from "@/lib/menu-data";
import { MenuBrowser } from "@/components/MenuBrowser";
import { TableLock } from "@/components/TableLock";

export default async function CustomerHome() {
  const categories = await getMenuData();

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
        <div className="absolute bottom-4 left-0 right-0 text-center px-4">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white">Fire. Smoke. Flavor.</h1>
          <p className="text-charcoal-100 text-sm mt-1">Order grilled-to-perfection BBQ, your way.</p>
        </div>
      </div>

      <MenuBrowser categories={categories} />
    </main>
  );
}
