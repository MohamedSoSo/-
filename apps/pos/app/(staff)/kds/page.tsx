import { getKdsItems } from "@/lib/kds-data";
import { KdsBoard } from "@/components/KdsBoard";

export const metadata = { title: "Kitchen — Smart BBQ POS" };

export default async function KdsPage() {
  const items = await getKdsItems();
  return <KdsBoard initialItems={items} />;
}
