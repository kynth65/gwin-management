export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="h-5 bg-muted rounded w-28" />
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-lg p-5 space-y-3">
          <div className="h-4 bg-muted rounded w-20" />
          {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-muted rounded w-40" />)}
        </div>
        <div className="bg-card border rounded-lg p-5 space-y-3">
          <div className="h-4 bg-muted rounded w-20" />
          {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-muted rounded w-36" />)}
        </div>
      </div>
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="border-b bg-muted/50 px-5 py-3 flex gap-6">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-4 bg-muted rounded w-16" />)}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-5 py-4 border-b flex gap-6">
            {[1, 2, 3, 4, 5].map((j) => <div key={j} className="h-4 bg-muted rounded w-16" />)}
          </div>
        ))}
        <div className="px-5 py-4 flex flex-col items-end gap-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-4 bg-muted rounded w-48" />)}
          <div className="h-6 bg-muted rounded w-40 mt-1" />
        </div>
      </div>
    </div>
  );
}
