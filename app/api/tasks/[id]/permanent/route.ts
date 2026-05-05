import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

// Hard delete — only available for tasks already in the Deleted section
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (!task.deletedAt) {
    return NextResponse.json({ error: "Task must be moved to Deleted first" }, { status: 400 });
  }

  const canDelete = task.senderId === session.user.id || session.user.isAdmin;
  if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
