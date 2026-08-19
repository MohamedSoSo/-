export function MenuSkeleton({ label }: { label: string }) {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-24" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div className="flex gap-2 overflow-x-auto py-4" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-2" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-panel overflow-hidden">
            <div className="skeleton h-36 w-full" />
            <div className="p-4 space-y-2">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-4 w-1/3 rounded mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
