import { Sparkles, AlertTriangle, AlertOctagon, CheckCircle2 } from "lucide-react";
import type { Insight } from "@/lib/insights-engine";
import { STATUS } from "@/lib/chart-colors";

const ICONS = { good: CheckCircle2, warning: AlertTriangle, critical: AlertOctagon };

export function InsightsBanner({ insights }: { insights: Insight[] }) {
  return (
    <section className="glass-panel p-4 mb-6">
      <h2 className="text-sm font-medium text-charcoal-100 mb-3 flex items-center gap-1.5">
        <Sparkles size={15} className="text-ember-400" /> Daily takeaways
        <span className="text-[10px] text-smoke-500 font-normal ml-1">(rule-based, not LLM-generated)</span>
      </h2>
      <div className="space-y-2">
        {insights.map((insight, i) => {
          const Icon = ICONS[insight.severity];
          return (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Icon size={15} className="mt-0.5 shrink-0" style={{ color: STATUS[insight.severity] }} />
              <p className="text-charcoal-100">{insight.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
