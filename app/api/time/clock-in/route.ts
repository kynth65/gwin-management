import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  const existing = await prisma.timeEntry.findFirst({
    where: { userId, clockOut: null },
  });
  if (existing) {
    return NextResponse.json({ error: "Already clocked in" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({ data: { userId } });
  return NextResponse.json({ entry }, { status: 201 });
}
