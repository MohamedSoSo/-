"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RfmRow, RfmSegment } from "@/lib/analytics/rfm";
import { buildWhatsAppLink, SEGMENT_MESSAGE_TEMPLATES } from "@/lib/whatsapp";
import { STATUS } from "@/lib/chart-colors";

const SEGMENT_COLOR: Record<RfmSegment, string> = {
  champion: STATUS.good,
  at_risk: STATUS.warning,
  churned: STATUS.critical,
  developing: "#898781",
};

export function RfmPanel({ rows }: { rows: RfmRow[] }) {
  const t = useTranslations("rfmPanel");
  const segments: RfmSegment[] = ["champion", "at_risk", "churned"];

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">{t("title")}</h3>
      <p className="text-xs text-smoke-500 mb-4">{t("explain")}</p>

      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">{t("noCustomers")}</p>
      ) : (
        <div className="space-y-5">
          {segments.map((segment) => {
            const inSegment = rows.filter((r) => r.segment === segment);
            if (inSegment.length === 0) return null;
            return (
              <div key={segment}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: SEGMENT_COLOR[segment] }} />
                  <p className="text-sm font-medium text-white">{t(`segments.${segment}`)}</p>
                  <span className="text-xs text-smoke-500">({inSegment.length})</span>
                </div>
                <div className="space-y-1.5">
                  {inSegment.slice(0, 8).map((customer) => {
                    const link = segment !== "developing" ? buildWhatsAppLink(customer.phone, SEGMENT_MESSAGE_TEMPLATES[segment]!) : null;
                    return (
                      <div key={customer.customerId} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-charcoal-100">{customer.displayName}</span>
                          <span className="text-smoke-500 text-xs ms-2">
                            {t("ordersMeta", {
                              count: customer.frequency,
                              amount: customer.monetary.toFixed(0),
                              days: customer.recencyDays,
                            })}
                          </span>
                        </div>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-1"
                          >
                            <MessageCircle size={12} /> {t("reEngage")}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
