import { getTranslations, setRequestLocale } from "next-intl/server";
import { getKdsItems } from "@/lib/kds-data";
import { KdsBoard } from "@/components/KdsBoard";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "kds" });
  return { title: `${t("title")} — Smart BBQ POS` };
}

export default async function KdsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const items = await getKdsItems();
  return <KdsBoard initialItems={items} />;
}
