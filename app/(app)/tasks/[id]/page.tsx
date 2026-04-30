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

const postponeInclude = {
  requester: { select: { id: true, name: true, role: true } },
  reviewer: { select: { id: true, name: true, role: true } },
} as const;

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      ...taskUserInclude,
      postponeRequests: {
        orderBy: { createdAt: "desc" },
        include: postponeInclude,
      },
    },
  });

  if (!task) notFound();

  const canView =
    task.senderId === session.user.id ||
    task.assigneeId === session.user.id ||
    session.user.isAdmin;

  if (!canView) redirect("/tasks");

  // Auto-mark as SEEN when the assignee opens the task for the first time
  if (task.assigneeId === session.user.id && task.status === "ASSIGNED") {
    await prisma.task.update({ where: { id: params.id }, data: { status: "SEEN" } });
    task.status = "SEEN" as typeof task.status;

    await prisma.notification.create({
      data: {
        userId: task.senderId,
        type: "TASK_SEEN",
        title: "Task seen",
        message: `${session.user.name} has seen: "${task.title}"`,
        taskId: task.id,
      },
    });
  }

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-auto">
      <TaskDetail
        task={task as unknown as TaskWithUsers & { images: string[]; postponeRequests: unknown[] }}
        currentUserId={session.user.id}
        isAdmin={session.user.isAdmin}
      />
    </div>
  );
}
