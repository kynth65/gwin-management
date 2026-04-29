export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TaskDetail } from "@/components/tasks/task-detail";
import type { TaskWithUsers } from "@/types";

const taskUserInclude = {
  sender: { select: { id: true, name: true, role: true } },
  assignee: { select: { id: true, name: true, role: true } },
} as const;

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: taskUserInclude,
  });

  if (!task) notFound();

  const canView =
    task.senderId === session.user.id ||
    task.assigneeId === session.user.id ||
    session.user.isAdmin;

  if (!canView) redirect("/tasks");

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <TaskDetail
        task={task as unknown as TaskWithUsers & { images: string[] }}
        currentUserId={session.user.id}
        isAdmin={session.user.isAdmin}
      />
    </div>
  );
}
