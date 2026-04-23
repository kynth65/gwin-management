export function HeaderSkeleton() {
  return (
    <div className="h-16 border-b bg-card flex items-center justify-between px-6 animate-pulse">
      <div className="h-5 bg-muted rounded w-32" />
      <div className="flex items-center gap-4">
        <div className="h-8 w-8 bg-muted rounded-md" />
        <div className="h-4 bg-muted rounded w-20" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6 space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-10 bg-muted rounded w-full" />
        </div>
      ))}
      <div className="h-10 bg-muted rounded w-32" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-card border rounded-lg p-6 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-24" />
          <div className="h-8 bg-muted rounded w-16" />
        </div>
        <div className="h-9 w-9 bg-muted rounded-md" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden animate-pulse">
      <div className="border-b bg-muted/50 px-4 py-3 flex gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-4 bg-muted rounded w-20" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b flex gap-4">
          {[1, 2, 3, 4, 5].map((j) => (
            <div key={j} className="h-4 bg-muted rounded w-20" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-muted rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
      </div>
      <TableSkeleton />
    </div>
  );
}
