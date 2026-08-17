"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/cart-store";

/**
 * QR table ordering: `?table=<qr_code_token>`. Resolving against the
 * unguessable token (not a sequential table number) means a stray guess at
 * the URL can't silently route someone's order to another table.
 */
export function TableLock() {
  const searchParams = useSearchParams();
  const token = searchParams.get("table");
  const lockToTable = useCartStore((s) => s.lockToTable);
  const tableLabel = useCartStore((s) => s.tableLabel);
  const orderMode = useCartStore((s) => s.orderMode);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    const tableToken = token;
    let cancelled = false;
    async function resolve() {
      const supabase = createClient();
      const { data } = await supabase
        .from("restaurant_tables")
        .select("id, label")
        .eq("qr_code_token", tableToken)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (data) lockToTable(data.id, data.label);
      else setNotFound(true);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [token, lockToTable]);

  if (orderMode === "qr_table" && tableLabel) {
    return (
      <div className="bg-ember-500 text-charcoal-900 text-sm font-medium text-center py-2">
        Ordering for Table {tableLabel}
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="bg-red-500/20 text-red-300 text-sm text-center py-2">
        That table QR code isn't recognized — you can still order for pickup or delivery.
      </div>
    );
  }

  return null;
}
