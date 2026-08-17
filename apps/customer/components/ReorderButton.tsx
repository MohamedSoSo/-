"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@bbq/ui";
import { useCartStore } from "@/lib/cart-store";
import { reconstructCartItems } from "@/lib/reorder";

export function ReorderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [loading, setLoading] = useState(false);

  async function handleReorder() {
    setLoading(true);
    const items = await reconstructCartItems(orderId);
    items.forEach((item) => addItem(item));
    setLoading(false);
    router.push("/");
    openDrawer();
  }

  return (
    <Button variant="glass" size="sm" onClick={handleReorder} disabled={loading}>
      {loading ? "Adding…" : "Re-order"}
    </Button>
  );
}
