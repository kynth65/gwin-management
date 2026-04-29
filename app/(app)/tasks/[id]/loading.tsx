export default function TaskDetailLoading() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-5 w-28 bg-muted rounded" />
        <div className="bg-card border rounded-xl p-6 space-y-4">
          <div className="flex gap-2">
            <div className="h-6 w-20 bg-muted rounded-full" />
            <div className="h-6 w-24 bg-muted rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-muted rounded" />
          <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-muted rounded" />
            ))}
          </div>
        </div>
        <div className="bg-card border rounded-xl p-6 space-y-3">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
