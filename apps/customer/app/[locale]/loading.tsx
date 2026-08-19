import { getTranslations } from "next-intl/server";
import { MenuSkeleton } from "@/components/MenuSkeleton";

export default async function HomeLoading() {
  const t = await getTranslations("common");

  return (
    <main className="min-h-screen">
      <div className="skeleton h-72 sm:h-96 lg:h-[32rem]" aria-hidden="true" />
      <MenuSkeleton label={t("loading")} />
    </main>
  );
}
