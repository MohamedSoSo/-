import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@bbq/i18n";
import { createClient } from "@/lib/supabase/server";
import { CategoryManager, type CategoryRow } from "./CategoryManager";
import { MenuItemManager, type MenuItemRow } from "./MenuItemManager";

const CATALOG_IMAGES_BUCKET = "catalog-images";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "catalog" });
  return { title: `${t("pageTitle")} — Smart BBQ` };
}

export default async function CatalogPage({ params: { locale } }: { params: { locale: string } }) {
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const supabase = createClient();
  const t = await getTranslations("catalog");

  // menu_items_staff_read_all / categories_management_write (both gated on
  // is_management()-tier roles, which is who can even reach this route per
  // the middleware) already grant this session visibility into
  // inactive/soft-deleted rows too — no extra filtering needed here.
  const [{ data: categories }, { data: items }, { data: weightTiers }] = await Promise.all([
    supabase.from("categories").select("id, name_en, name_ar, sort_order, deleted_at").order("sort_order"),
    supabase
      .from("menu_items")
      .select(
        "id, name_en, name_ar, description_en, description_ar, category_id, base_price, is_weight_based, default_weight_unit, supports_doneness, available_doneness_levels, default_station, is_active, is_featured, deleted_at, image_path"
      )
      .order("name_en"),
    supabase.from("weight_tiers").select("id, menu_item_id, label, grams, price_multiplier").order("sort_order"),
  ]);

  const tiersByItem = new Map<string, MenuItemRow["weight_tiers"]>();
  for (const wt of weightTiers ?? []) {
    const list = tiersByItem.get(wt.menu_item_id) ?? [];
    list.push({ id: wt.id, label: wt.label, grams: wt.grams, price_multiplier: wt.price_multiplier });
    tiersByItem.set(wt.menu_item_id, list);
  }

  const categoryRows: CategoryRow[] = (categories ?? []).map((c) => ({
    id: c.id,
    name_en: c.name_en,
    name_ar: c.name_ar,
    sort_order: c.sort_order,
    deleted_at: c.deleted_at,
  }));

  const itemRows: MenuItemRow[] = (items ?? []).map((item) => ({
    ...item,
    image_url: item.image_path
      ? supabase.storage.from(CATALOG_IMAGES_BUCKET).getPublicUrl(item.image_path).data.publicUrl
      : null,
    weight_tiers: tiersByItem.get(item.id) ?? [],
  }));

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-semibold" style={{ color: "var(--brand-accent)" }}>
          {t("pageTitle")}
        </h1>
        <p className="text-charcoal-100 mt-1">{t("pageSubtitle")}</p>
      </header>

      <CategoryManager categories={categoryRows} />
      <MenuItemManager categories={categoryRows.filter((c) => !c.deleted_at)} items={itemRows} />
    </main>
  );
}
