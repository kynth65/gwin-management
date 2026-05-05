import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

const userSelect = { id: true, name: true, role: true } as const;

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const canView =
    task.senderId === session.user.id ||
    task.assigneeId === session.user.id ||
    session.user.isAdmin;

  if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const body = await req.json();

  // Edit mode (priority / dueDate) — admin only
  if ("priority" in body || "dueDate" in body) {
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Only an admin can edit this task" }, { status: 403 });
    }
    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(body.priority ? { priority: body.priority } : {}),
        ...("dueDate" in body ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
      },
      include: { sender: { select: userSelect }, assignee: { select: userSelect } },
    });
    return NextResponse.json(updated);
  }

  // Status update mode — only assignee or admin
  const isAssignee = task.assigneeId === session.user.id;
  const isAdmin = session.user.isAdmin;

  if (!isAssignee && !isAdmin) {
    return NextResponse.json({ error: "Only the assignee can update task status" }, { status: 403 });
  }

  const { status } = body;
  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { status },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });

  return NextResponse.json(updated);
}

// Soft delete — moves task to Deleted tab (recoverable)
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isSender = task.senderId === session.user.id;
  const isAdmin = session.user.isAdmin;

  if (!isSender && !isAdmin) {
    return NextResponse.json({ error: "Only the sender or an admin can delete tasks" }, { status: 403 });
  }

  await prisma.task.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ success: true });
}
