import { getTranslations, setRequestLocale } from "next-intl/server";
import { getQuickMenu } from "@/lib/quick-menu";
import { QuickOrderBuilder } from "./QuickOrderBuilder";

export default async function NewOrderPage({ params }: { params: { tableId: string; locale: string } }) {
  setRequestLocale(params.locale);
  const [categories, t] = await Promise.all([getQuickMenu(), getTranslations("newOrder")]);
  return (
    <main className="p-4 pb-28 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">{t("title")}</h1>
      <QuickOrderBuilder tableId={params.tableId} categories={categories} />
    </main>
  );
}
