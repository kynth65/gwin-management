import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { title, content, pinned } = await req.json();

  const announcement = await prisma.announcement.update({
    where: { id: params.id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(pinned !== undefined ? { pinned } : {}),
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(announcement);
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  await prisma.announcement.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
