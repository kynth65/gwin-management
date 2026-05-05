import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const active = await prisma.timeEntry.findFirst({
    where: { userId, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!active) {
    return NextResponse.json({ error: "Not clocked in" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: { clockOut: new Date() },
  });
  return NextResponse.json({ entry });
}
