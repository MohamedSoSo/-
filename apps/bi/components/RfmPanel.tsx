"use client";

import { MessageCircle } from "lucide-react";
import type { RfmRow, RfmSegment } from "@/lib/analytics/rfm";
import { SEGMENT_LABELS } from "@/lib/analytics/rfm";
import { buildWhatsAppLink, SEGMENT_MESSAGE_TEMPLATES } from "@/lib/whatsapp";
import { STATUS } from "@/lib/chart-colors";

const SEGMENT_COLOR: Record<RfmSegment, string> = {
  champion: STATUS.good,
  at_risk: STATUS.warning,
  churned: STATUS.critical,
  developing: "#898781",
};

export function RfmPanel({ rows }: { rows: RfmRow[] }) {
  const segments: RfmSegment[] = ["champion", "at_risk", "churned"];

  return (
    <div className="glass-panel p-4">
      <h3 className="text-sm font-medium text-charcoal-100 mb-1">Customer segments (RFM)</h3>
      <p className="text-xs text-smoke-500 mb-4">
        Based on all-time order history, not just this date range. WhatsApp links open pre-filled messages — no
        Business API configured, so sending is still one tap per contact.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-smoke-400">No customer-attributed completed orders yet — segments populate once signed-in customers order.</p>
      ) : (
        <div className="space-y-5">
          {segments.map((segment) => {
            const inSegment = rows.filter((r) => r.segment === segment);
            if (inSegment.length === 0) return null;
            return (
              <div key={segment}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: SEGMENT_COLOR[segment] }} />
                  <p className="text-sm font-medium text-white">{SEGMENT_LABELS[segment]}</p>
                  <span className="text-xs text-smoke-500">({inSegment.length})</span>
                </div>
                <div className="space-y-1.5">
                  {inSegment.slice(0, 8).map((customer) => {
                    const link = segment !== "developing" ? buildWhatsAppLink(customer.phone, SEGMENT_MESSAGE_TEMPLATES[segment]!) : null;
                    return (
                      <div key={customer.customerId} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-charcoal-100">{customer.displayName}</span>
                          <span className="text-smoke-500 text-xs ml-2">
                            {customer.frequency} orders · {customer.monetary.toFixed(0)} SAR · {customer.recencyDays}d ago
                          </span>
                        </div>
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-1"
                          >
                            <MessageCircle size={12} /> Re-engage
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
