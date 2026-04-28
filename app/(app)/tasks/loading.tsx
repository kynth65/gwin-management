import { TableSkeleton } from "@/components/shared/skeletons";

export default function TasksLoading() {
  return (
    <div className="flex-1 p-4 sm:p-6">
      <TableSkeleton rows={6} />
    </div>
  );
}
