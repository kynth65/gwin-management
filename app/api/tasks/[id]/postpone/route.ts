import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (task.assigneeId !== session.user.id) {
    return NextResponse.json({ error: "Only the assignee can request a postpone" }, { status: 403 });
  }

  if (task.status !== "STARTED" && task.status !== "SEEN" && task.status !== "ASSIGNED") {
    return NextResponse.json({ error: "Task cannot be postponed from its current status" }, { status: 400 });
  }

  const existing = await prisma.postponeRequest.findFirst({
    where: { taskId: params.id, status: "PENDING" },
  });
  if (existing) {
    return NextResponse.json({ error: "A postpone request is already pending for this task" }, { status: 409 });
  }

  const { description, extensionDays, imageUrls } = await req.json();

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  if (!extensionDays || typeof extensionDays !== "number" || extensionDays < 1) {
    return NextResponse.json({ error: "Extension days must be a positive number" }, { status: 400 });
  }

  const request = await prisma.postponeRequest.create({
    data: {
      taskId: params.id,
      requesterId: session.user.id,
      description: description.trim(),
      images: Array.isArray(imageUrls) ? imageUrls : [],
      extensionDays,
    },
    include: {
      requester: { select: { id: true, name: true, role: true } },
    },
  });

  await prisma.notification.create({
    data: {
      userId: task.senderId,
      type: "POSTPONE_REQUESTED",
      title: "Postpone request submitted",
      message: `${session.user.name} requested a ${extensionDays}-day extension on: "${task.title}"`,
      taskId: task.id,
    },
  });

  return NextResponse.json(request, { status: 201 });
}
