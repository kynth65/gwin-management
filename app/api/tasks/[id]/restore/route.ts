import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

const userSelect = { id: true, name: true, role: true } as const;

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!task.deletedAt) return NextResponse.json({ error: "Task is not in the deleted section" }, { status: 400 });

  const canRestore = task.senderId === session.user.id || session.user.isAdmin;
  if (!canRestore) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const restored = await prisma.task.update({
    where: { id: params.id },
    data: { deletedAt: null },
    include: { sender: { select: userSelect }, assignee: { select: userSelect } },
  });

  return NextResponse.json(restored);
}
