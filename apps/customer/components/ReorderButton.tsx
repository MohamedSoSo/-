"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@bbq/ui";
import { useCartStore } from "@/lib/cart-store";
import { reconstructCartItems } from "@/lib/reorder";
import { useRouter } from "@/i18n/navigation";

export function ReorderButton({ orderId }: { orderId: string }) {
  const t = useTranslations("reorder");
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
    <Button variant="glass" size="sm" onClick={handleReorder} disabled={loading} aria-busy={loading}>
      {loading ? t("adding") : t("button")}
    </Button>
  );
}
