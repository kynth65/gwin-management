import { FormSkeleton } from "@/components/shared/skeletons";

export default function ProfileLoading() {
  return (
    <div className="flex-1 p-6 max-w-2xl space-y-8 overflow-auto">
      <FormSkeleton />
      <FormSkeleton />
    </div>
  );
}
