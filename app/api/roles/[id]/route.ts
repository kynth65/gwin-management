import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional().nullable(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  try {
    const role = await prisma.userRole.update({
      where: { id: params.id },
      data: parsed.data,
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json(role);
  } catch {
    return NextResponse.json({ error: "Role not found or name already taken" }, { status: 409 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const role = await prisma.userRole.findUnique({
    where: { id: params.id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
  if (role._count.users > 0) {
    return NextResponse.json(
      { error: "Cannot delete a role that is assigned to users" },
      { status: 400 }
    );
  }

  // Prevent deleting the last admin role
  if (role.isAdmin) {
    const adminRoleCount = await prisma.userRole.count({ where: { isAdmin: true } });
    if (adminRoleCount <= 1) {
      return NextResponse.json({ error: "Cannot delete the only admin role" }, { status: 400 });
    }
  }

  await prisma.userRole.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
