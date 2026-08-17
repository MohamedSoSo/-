import { getQuickMenu } from "@/lib/quick-menu";
import { QuickOrderBuilder } from "./QuickOrderBuilder";

export default async function NewOrderPage({ params }: { params: { tableId: string } }) {
  const categories = await getQuickMenu();
  return (
    <main className="p-4 pb-28 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">New order</h1>
      <QuickOrderBuilder tableId={params.tableId} categories={categories} />
    </main>
  );
}
