export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TasksContent } from "@/components/tasks/tasks-content";
import { TableSkeleton } from "@/components/shared/skeletons";
import type { TaskWithUsers, AssignableUser } from "@/types";

const taskUserInclude = {
  sender: { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
} as const;

async function getTasksData(userId: string, isAdmin: boolean) {
  const [inbox, sent, users] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId },
      orderBy: { createdAt: "desc" },
      include: taskUserInclude,
    }),
    prisma.task.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      include: taskUserInclude,
    }),
    prisma.user.findMany({
      where: isAdmin ? {} : { role: { name: "Staff" } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { inbox, sent, users };
}

async function TasksLoader({ userId, isAdmin, userRole }: { userId: string; isAdmin: boolean; userRole: string }) {
  const { inbox, sent, users } = await getTasksData(userId, isAdmin);

  return (
    <TasksContent
      inbox={inbox as unknown as TaskWithUsers[]}
      sent={sent as unknown as TaskWithUsers[]}
      users={users as unknown as AssignableUser[]}
      currentUserId={userId}
      currentUserRole={userRole}
    />
  );
}

export default async function TasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <TasksLoader userId={session.user.id} isAdmin={session.user.isAdmin} userRole={session.user.role} />
      </Suspense>
    </div>
  );
}
