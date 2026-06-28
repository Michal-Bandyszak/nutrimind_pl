export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="glass-header sticky top-0 z-30">
        <div className="flex items-start justify-between gap-4 px-4 py-4 lg:px-6">
          <div className="space-y-2 animate-pulse">
            <div className="h-5 w-32 rounded-full bg-gray-200" />
            <div className="h-3 w-24 rounded-full bg-gray-100" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-full bg-gray-200" />
        </div>
      </div>

      <div className="px-4 py-5 lg:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
            >
              <div className="h-4 w-20 rounded-full bg-gray-200" />
              <div className="mt-3 h-5 w-2/3 rounded-full bg-gray-200" />
              <div className="mt-4 space-y-2">
                <div className="h-10 rounded-2xl bg-gray-100" />
                <div className="h-10 rounded-2xl bg-gray-100" />
                <div className="h-10 rounded-2xl bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
