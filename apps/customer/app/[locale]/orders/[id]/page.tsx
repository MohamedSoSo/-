import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/server";
import { OrderTracker } from "@/components/OrderTracker";

export default async function OrderTrackingPage({ params }: { params: { id: string; locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  setRequestLocale(params.locale);

  const supabase = createClient();
  const t = await getTranslations("orderTracker");

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, channel, status, grand_total, delivery_lat, delivery_lng, restaurant_tables (label)")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, line_total, menu_items (name_en, name_ar)")
    .eq("order_id", params.id);

  const { data: deliveryFlag } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", "delivery_tracking")
    .maybeSingle();

  const showDeliveryLink =
    order.channel === "delivery" && deliveryFlag?.enabled && order.delivery_lat != null && order.delivery_lng != null;

  return (
    <main>
      <OrderTracker
        initialOrder={{
          id: order.id,
          order_number: order.order_number,
          channel: order.channel,
          status: order.status,
          grand_total: order.grand_total,
          table_label: (order.restaurant_tables as unknown as { label: string } | null)?.label ?? null,
        }}
        initialItems={(items ?? []).map((item) => {
          const menuItem = item.menu_items as unknown as { name_en: string; name_ar: string } | null;
          return {
            id: item.id,
            name_en: menuItem?.name_en ?? t("unknownItem"),
            name_ar: menuItem?.name_ar ?? t("unknownItem"),
            quantity: item.quantity,
            line_total: item.line_total,
          };
        })}
      />
      {showDeliveryLink && (
        <div className="max-w-lg mx-auto px-4 pb-8 -mt-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center glass-panel py-3 text-sm text-ember-400"
          >
            {t("viewDeliveryLocation")}
          </a>
        </div>
      )}
    </main>
  );
}
