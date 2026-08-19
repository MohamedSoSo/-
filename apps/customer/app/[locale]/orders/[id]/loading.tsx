import { getTranslations } from "next-intl/server";
import { OrderTrackerSkeleton } from "@/components/OrderTrackerSkeleton";

export default async function OrderTrackingLoading() {
  const t = await getTranslations("common");
  return <OrderTrackerSkeleton label={t("loading")} />;
}
