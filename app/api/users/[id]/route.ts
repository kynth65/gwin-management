import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  roleId: z.string().min(1).optional(),
  hourlyRate: z.number().min(0).nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const updateData: { roleId?: string; hourlyRate?: number | null } = {};

  if (parsed.data.roleId !== undefined) {
    const roleExists = await prisma.userRole.findUnique({ where: { id: parsed.data.roleId } });
    if (!roleExists) {
      return NextResponse.json({ error: "Role not found" }, { status: 400 });
    }
    updateData.roleId = parsed.data.roleId;
  }

  if (parsed.data.hourlyRate !== undefined) {
    updateData.hourlyRate = parsed.data.hourlyRate;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      hourlyRate: true,
      role: { select: { id: true, name: true, isAdmin: true } },
      createdAt: true,
    },
  });

  return NextResponse.json({
    ...user,
    hourlyRate: user.hourlyRate !== null ? Number(user.hourlyRate) : null,
  });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
