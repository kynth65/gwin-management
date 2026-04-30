import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (task.assigneeId !== session.user.id) {
    return NextResponse.json({ error: "Only the assignee can complete this task" }, { status: 403 });
  }

  if (task.status !== "STARTED") {
    return NextResponse.json({ error: "Task must be started before completing" }, { status: 400 });
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { status: "COMPLETED" },
  });

  await prisma.notification.create({
    data: {
      userId: task.senderId,
      type: "TASK_COMPLETED",
      title: "Task completed",
      message: `${session.user.name} completed: "${task.title}"`,
      taskId: task.id,
    },
  });

  return NextResponse.json(updated);
}
