import { Sparkles, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Insight } from "@/lib/insights-engine";
import { localizedField, type Locale } from "@bbq/i18n";
import { STATUS } from "@/lib/chart-colors";

const ICONS = { good: CheckCircle2, warning: AlertTriangle, critical: AlertOctagon };

/**
 * insights-engine.ts is locale-agnostic (see its own header comment) — it
 * emits a translation key + a flat values bag. The two insight types that
 * carry data needing locale-aware resolution (a bilingual category name,
 * and a raw ISO date that needs locale-correct formatting) get resolved
 * here, right before the actual t() call, since this is the one place that
 * has both the raw insight and the active locale.
 */
function resolveValues(
  insight: Insight,
  locale: Locale,
  t: ReturnType<typeof useTranslations>
): Record<string, string | number> {
  const values = { ...insight.values };

  if (insight.key === "yieldShrinkageOutlier") {
    const nameEn = String(values.categoryNameEn ?? "");
    const nameAr = String(values.categoryNameAr ?? "");
    values.category = localizedField(nameEn, nameAr, locale);
    if (typeof values.shift === "string") values.shift = t(`shiftLabels.${values.shift}`);
    delete values.categoryNameEn;
    delete values.categoryNameAr;
  }

  if (insight.key === "cashVariance" && typeof values.date === "string") {
    values.date = new Date(values.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US");
  }

  return values;
}

export function InsightsBanner({ insights }: { insights: Insight[] }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("insightsBanner");
  const tInsights = useTranslations("insights");

  return (
    <section className="glass-panel p-4 mb-6">
      <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
        <Sparkles size={15} className="text-ember-400" /> {t("title")}
        <span className="text-[10px] text-smoke-400 font-normal ms-1">{t("ruleBased")}</span>
      </h2>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = ICONS[insight.severity];
          const values = resolveValues(insight, locale, tInsights);
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Icon aria-hidden="true" size={15} className="mt-0.5 shrink-0" style={{ color: STATUS[insight.severity] }} />
              <p className="text-charcoal-100">{tInsights(insight.key, values)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
