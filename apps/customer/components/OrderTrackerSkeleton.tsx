export function OrderTrackerSkeleton({ label }: { label: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>

      <div className="glass-panel p-5 mb-6" aria-hidden="true">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-6 w-40 rounded mt-2" />
      </div>

      <div className="space-y-4 mb-6" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="skeleton h-7 w-7 rounded-full shrink-0" />
            <div className="skeleton h-4 w-32 rounded mt-1.5" />
          </div>
        ))}
      </div>

      <div className="glass-panel p-5" aria-hidden="true">
        <div className="skeleton h-4 w-16 rounded mb-3" />
        <div className="space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-3/4 rounded" />
        </div>
      </div>
    </div>
  );
}
