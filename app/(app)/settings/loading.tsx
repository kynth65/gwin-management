import { TableSkeleton, FormSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="flex-1 p-6 space-y-8 overflow-auto max-w-3xl">
      <div>
        <div className="h-5 bg-muted rounded w-40 mb-4 animate-pulse" />
        <TableSkeleton rows={3} />
      </div>
      <div>
        <div className="h-5 bg-muted rounded w-40 mb-4 animate-pulse" />
        <FormSkeleton />
      </div>
    </div>
  );
}
