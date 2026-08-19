import { getTranslations } from "next-intl/server";
import { AccountSkeleton } from "@/components/AccountSkeleton";

export default async function AccountLoading() {
  const t = await getTranslations("common");
  return <AccountSkeleton label={t("loading")} />;
}
