import { TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="bg-card border rounded-lg p-6 animate-pulse space-y-3">
        <div className="h-5 bg-muted rounded w-40" />
        <div className="flex gap-3">
          <div className="h-9 bg-muted rounded w-36" />
          <div className="h-9 bg-muted rounded w-36" />
        </div>
      </div>
      <div>
        <div className="h-5 bg-muted rounded w-36 mb-4 animate-pulse" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );
}
