export type DateRangePreset = "today" | "7d" | "30d" | "custom";

export interface DateRange {
  startISO: string; // inclusive, start of day
  endISO: string; // exclusive, start of the day AFTER the range
  label: string;
  days: number;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function resolveRange(preset: DateRangePreset, custom?: { start: string; end: string }): DateRange {
  const today = startOfDay(new Date());

  if (preset === "custom" && custom) {
    const start = startOfDay(new Date(custom.start));
    const endExclusive = startOfDay(new Date(custom.end));
    endExclusive.setDate(endExclusive.getDate() + 1);
    const days = Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / 86400000));
    return { startISO: start.toISOString(), endISO: endExclusive.toISOString(), label: "Custom", days };
  }

  const days = preset === "today" ? 1 : preset === "7d" ? 7 : 30;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  const endExclusive = new Date(today);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const label = preset === "today" ? "Today" : preset === "7d" ? "Last 7 days" : "Last 30 days";
  return { startISO: start.toISOString(), endISO: endExclusive.toISOString(), label, days };
}

/** The same-length window immediately preceding the range, for period-over-period deltas. */
export function priorRange(range: DateRange): DateRange {
  const start = new Date(range.startISO);
  const end = new Date(range.endISO);
  const spanMs = end.getTime() - start.getTime();
  const priorEnd = new Date(start);
  const priorStart = new Date(start.getTime() - spanMs);
  return { startISO: priorStart.toISOString(), endISO: priorEnd.toISOString(), label: "Prior period", days: range.days };
}
