import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getOrderDetail } from "@/lib/order-detail-data";
import { OrderDetail } from "./OrderDetail";

export default async function OrderDetailPage({ params }: { params: { orderId: string; locale: string } }) {
  setRequestLocale(params.locale);
  const { order, items, payments, tables } = await getOrderDetail(params.orderId);
  if (!order) notFound();

  return (
    <main className="p-4 max-w-2xl mx-auto pb-8">
      <OrderDetail initialOrder={order} initialItems={items} initialPayments={payments} tables={tables} />
    </main>
  );
}
