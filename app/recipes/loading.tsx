export default function Loading() {
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="glass-header sticky top-0 z-30">
        <div className="px-4 py-4 lg:px-6 animate-pulse">
          <div className="h-5 w-24 rounded-full bg-gray-200" />
          <div className="mt-2 h-3 w-40 rounded-full bg-gray-100" />
        </div>
      </div>

      <div className="space-y-4 px-4 py-5 lg:px-6">
        <div className="h-11 animate-pulse rounded-2xl bg-white/70 shadow-sm ring-1 ring-border" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-8 w-24 animate-pulse rounded-full bg-gray-200" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-[1.5rem] border border-border bg-white/70 p-4 shadow-sm"
          >
            <div className="h-4 w-24 rounded-full bg-gray-200" />
            <div className="mt-3 h-5 w-3/4 rounded-full bg-gray-200" />
            <div className="mt-4 flex gap-2">
              <div className="h-4 w-16 rounded-full bg-gray-100" />
              <div className="h-4 w-16 rounded-full bg-gray-100" />
              <div className="h-4 w-16 rounded-full bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
