import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReorderButton } from "@/components/ReorderButton";

const ACTIVE_STATUSES = new Set([
  "placed",
  "confirmed",
  "grilling",
  "kitchen_prep",
  "plating",
  "ready",
  "out_for_delivery",
]);

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: orders }, { data: completedOrders }] = await Promise.all([
    supabase.from("profiles").select("display_name, phone").eq("id", user.id).single(),
    supabase
      .from("orders")
      .select("id, order_number, channel, status, grand_total, placed_at")
      .eq("customer_id", user.id)
      .order("placed_at", { ascending: false })
      .limit(20),
    supabase.from("orders").select("grand_total").eq("customer_id", user.id).eq("status", "completed"),
  ]);

  const loyaltyPoints = Math.floor((completedOrders ?? []).reduce((sum, o) => sum + o.grand_total, 0) / 10);
  const activeOrder = (orders ?? []).find((o) => ACTIVE_STATUSES.has(o.status));

  return (
    <main className="max-w-lg mx-auto px-4 py-8 pb-16">
      <h1 className="text-2xl font-semibold text-white mb-1">{profile?.display_name ?? "Your account"}</h1>
      {profile?.phone && <p className="text-sm text-smoke-400 mb-6">{profile.phone}</p>}

      <div className="glass-panel p-5 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-smoke-400">Loyalty points</p>
          <p className="text-2xl font-semibold text-ember-400">{loyaltyPoints}</p>
        </div>
        <p className="text-xs text-smoke-500 max-w-[10rem] text-right">1 point per 10 SAR spent on completed orders</p>
      </div>

      {activeOrder && (
        <Link
          href={`/orders/${activeOrder.id}`}
          className="block glass-panel p-4 mb-6 border-ember-500/40 hover:border-ember-500"
        >
          <p className="text-sm text-ember-400 font-medium">Active order — {activeOrder.order_number}</p>
          <p className="text-xs text-smoke-400 mt-0.5">Tap to track</p>
        </Link>
      )}

      <h2 className="text-sm font-medium text-charcoal-100 mb-3">Order history</h2>
      <div className="space-y-3">
        {(orders ?? []).map((order) => (
          <div key={order.id} className="glass-panel p-4 flex items-center justify-between gap-3">
            <div>
              <Link href={`/orders/${order.id}`} className="text-white font-medium hover:underline">
                {order.order_number}
              </Link>
              <p className="text-xs text-smoke-400 capitalize mt-0.5">
                {order.status.replace(/_/g, " ")} · {order.grand_total.toFixed(2)} SAR
              </p>
            </div>
            {order.status === "completed" && <ReorderButton orderId={order.id} />}
          </div>
        ))}
        {!orders?.length && <p className="text-smoke-400 text-sm">No orders yet.</p>}
      </div>
    </main>
  );
}
