export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TimeContent } from "@/components/time/time-content";

export default async function TimePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <TimeContent userId={session.user.id} isAdmin={session.user.isAdmin} />
    </div>
  );
}
