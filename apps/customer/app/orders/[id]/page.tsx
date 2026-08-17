import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrderTracker } from "@/components/OrderTracker";

export default async function OrderTrackingPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, channel, status, grand_total, delivery_lat, delivery_lng, restaurant_tables (label)")
    .eq("id", params.id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id, quantity, line_total, menu_items (name_en)")
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
        initialItems={(items ?? []).map((item) => ({
          id: item.id,
          name_en: (item.menu_items as unknown as { name_en: string } | null)?.name_en ?? "Item",
          quantity: item.quantity,
          line_total: item.line_total,
        }))}
      />
      {showDeliveryLink && (
        <div className="max-w-lg mx-auto px-4 pb-8 -mt-4">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_lat},${order.delivery_lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center glass-panel py-3 text-sm text-ember-400"
          >
            View delivery location
          </a>
        </div>
      )}
    </main>
  );
}
