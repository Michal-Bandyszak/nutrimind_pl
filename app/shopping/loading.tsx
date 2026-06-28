export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="glass-header sticky top-0 z-30">
        <div className="px-4 py-4 lg:px-6 animate-pulse">
          <div className="h-5 w-32 rounded-full bg-gray-200" />
          <div className="mt-2 h-3 w-44 rounded-full bg-gray-100" />
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 lg:px-6">
        <div className="animate-pulse rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="h-3 w-24 rounded-full bg-gray-200" />
            <div className="h-3 w-20 rounded-full bg-gray-100" />
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100" />
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index}>
            <div className="mb-2 h-4 w-28 animate-pulse rounded-full bg-gray-200" />
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-white/70">
              {Array.from({ length: 4 }).map((__, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <div className="h-4 w-32 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-4 w-16 animate-pulse rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
