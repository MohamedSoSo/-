import { getFloorTables } from "@/lib/floor-data";
import { FloorPlan } from "@/components/FloorPlan";

export const metadata = { title: "Floor — Smart BBQ POS" };

export default async function FloorPage() {
  const tables = await getFloorTables();

  return (
    <main className="p-6 overflow-auto">
      <h1 className="text-xl font-semibold text-white mb-4">Floor</h1>
      <FloorPlan initialTables={tables} />
    </main>
  );
}
