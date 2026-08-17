"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FloorTable } from "@/lib/floor-data";
import type { TableStatus } from "@bbq/types";
import { createClient } from "@/lib/supabase/client";

const STATUS_COLOR: Record<TableStatus, string> = {
  free: "bg-emerald-500/20 border-emerald-500/50 text-emerald-300",
  occupied: "bg-ember-500/20 border-ember-500/50 text-ember-300",
  reserved: "bg-blue-500/20 border-blue-500/50 text-blue-300",
  needs_cleaning: "bg-red-500/20 border-red-500/50 text-red-300",
};

export function FloorPlan({ initialTables }: { initialTables: FloorTable[] }) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("floor_plan")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, (payload) => {
        const row = payload.new as Partial<FloorTable> & { id?: string };
        if (!row.id) return;
        setTables((prev) => prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  async function cycleStatus(table: FloorTable) {
    if (table.active_order) {
      router.push(`/order/${table.active_order.id}`);
      return;
    }
    const next: Record<TableStatus, TableStatus> = {
      free: "reserved",
      reserved: "needs_cleaning",
      needs_cleaning: "free",
      occupied: "occupied",
    };
    const supabase = createClient();
    await supabase.from("restaurant_tables").update({ status: next[table.status] }).eq("id", table.id);
  }

  const maxX = Math.max(...tables.map((t) => t.position_x), 0) + 160;
  const maxY = Math.max(...tables.map((t) => t.position_y), 0) + 140;

  return (
    <div className="relative mx-auto" style={{ width: maxX, height: maxY, minWidth: "100%" }}>
      {tables.map((table) => (
        <div
          key={table.id}
          style={{ left: table.position_x, top: table.position_y }}
          className={`absolute w-32 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-0.5 transition-colors ${STATUS_COLOR[table.active_order ? "occupied" : table.status]}`}
        >
          <button onClick={() => cycleStatus(table)} className="flex flex-col items-center">
            <span className="font-semibold text-lg">{table.label}</span>
            <span className="text-xs opacity-80">{table.seats} seats</span>
            {table.active_order ? (
              <span className="text-xs font-medium mt-1">{table.active_order.grand_total.toFixed(0)} SAR</span>
            ) : (
              <span className="text-xs capitalize opacity-80">{table.status.replace("_", " ")}</span>
            )}
          </button>
          {!table.active_order && (
            <button
              onClick={() => router.push(`/floor/${table.id}/new`)}
              className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-white/10 border border-white/20 text-white text-sm hover:bg-white/20"
              aria-label={`New order for ${table.label}`}
            >
              +
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
