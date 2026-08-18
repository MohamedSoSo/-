import { useTranslations } from "next-intl";
import { AppImage, ASSET_KEYS } from "@bbq/ui";
import { ChefHat } from "lucide-react";

export function MaintenanceOverlay() {
  const t = useTranslations("maintenance");
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="relative h-14 w-14 mb-6">
        <AppImage assetKey={ASSET_KEYS.logoPrimary} alt="Smart BBQ" fill sizes="56px" className="object-contain" />
      </div>
      <ChefHat size={40} className="text-ember-500 mb-4" />
      <h1 className="text-2xl font-semibold text-white mb-2">{t("title")}</h1>
      <p className="text-charcoal-100 max-w-sm">{t("body")}</p>
    </main>
  );
}
