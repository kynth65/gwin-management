export default function TimeLoading() {
  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto space-y-6 animate-pulse">
      {/* Tab bar */}
      <div className="flex gap-2 border-b pb-0">
        <div className="h-9 bg-muted rounded-t w-20" />
        <div className="h-9 bg-muted/50 rounded-t w-24" />
        <div className="h-9 bg-muted/50 rounded-t w-20" />
      </div>

      {/* Clock-in card */}
      <div className="bg-card border rounded-xl p-6 space-y-4 max-w-sm">
        <div className="h-4 bg-muted rounded w-28" />
        <div className="h-12 bg-muted rounded w-36" />
        <div className="h-10 bg-muted rounded w-32" />
      </div>

      {/* Session history rows */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-3 flex gap-4">
          {[80, 120, 80, 100].map((w, i) => (
            <div key={i} className="h-4 bg-muted rounded" style={{ width: w }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b flex gap-4">
            {[80, 120, 80, 100].map((w, j) => (
              <div key={j} className="h-4 bg-muted rounded" style={{ width: w }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
