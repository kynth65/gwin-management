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

  const isAssignee = task.assigneeId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAssignee && !isAdmin) {
    return NextResponse.json({ error: "Only the assignee can update task status" }, { status: 403 });
  }

  const { status } = await req.json();

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: { status },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const isSender = task.senderId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isSender && !isAdmin) {
    return NextResponse.json({ error: "Only the sender or an admin can delete tasks" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
