import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const userSelect = { id: true, name: true, role: true } as const;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "inbox";

  const userId = session.user.id;

  const where =
    type === "sent"
      ? { senderId: userId }
      : { assigneeId: userId };

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, assigneeId, priority, dueDate } = await req.json();

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!assigneeId) return NextResponse.json({ error: "Assignee is required" }, { status: 400 });

  const assignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { role: { select: { isAdmin: true } } } });
  if (!assignee) return NextResponse.json({ error: "Assignee not found" }, { status: 404 });

  // STAFF cannot assign tasks to ADMIN
  if (!session.user.isAdmin && assignee.role.isAdmin) {
    return NextResponse.json({ error: "Staff members cannot assign tasks to admins" }, { status: 403 });
  }

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      assigneeId,
      senderId: session.user.id,
      priority: priority ?? "MEDIUM",
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });

  return NextResponse.json(task, { status: 201 });
}
