import { getTranslations, setRequestLocale } from "next-intl/server";
import { getFloorTables } from "@/lib/floor-data";
import { FloorPlan } from "@/components/FloorPlan";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "floor" });
  return { title: `${t("title")} — Smart BBQ POS` };
}

export default async function FloorPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const [tables, t] = await Promise.all([getFloorTables(), getTranslations("floor")]);

  return (
    <main className="p-6 overflow-auto">
      <h1 className="text-xl font-semibold text-white mb-4">{t("title")}</h1>
      <FloorPlan initialTables={tables} />
    </main>
  );
}
