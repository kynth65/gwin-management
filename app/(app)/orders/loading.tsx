import { TableSkeleton } from "@/components/shared/skeletons";

export default function Loading() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <TableSkeleton rows={12} />
    </div>
  );
}
