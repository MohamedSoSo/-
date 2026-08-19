export function AccountSkeleton({ label }: { label: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-8 pb-16" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>

      <div aria-hidden="true">
        <div className="skeleton h-7 w-40 rounded mb-2" />
        <div className="skeleton h-4 w-28 rounded mb-6" />

        <div className="glass-panel p-5 mb-6 flex items-center justify-between">
          <div>
            <div className="skeleton h-3 w-20 rounded mb-2" />
            <div className="skeleton h-7 w-12 rounded" />
          </div>
          <div className="skeleton h-3 w-24 rounded" />
        </div>

        <div className="glass-panel p-5">
          <div className="skeleton h-4 w-28 rounded mb-3" />
          <div className="divide-y divide-white/5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex-1">
                  <div className="skeleton h-4 w-24 rounded mb-2" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
