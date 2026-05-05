import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [active, todayEntries] = await Promise.all([
    prisma.timeEntry.findFirst({
      where: { userId, clockOut: null },
      orderBy: { clockIn: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: { userId, clockIn: { gte: startOfDay }, clockOut: { not: null } },
    }),
  ]);

  const todayTotal = todayEntries.reduce((acc, entry) => {
    const ms = new Date(entry.clockOut!).getTime() - new Date(entry.clockIn).getTime();
    return acc + Math.floor(ms / 60000);
  }, 0);

  return NextResponse.json({ active, todayTotal });
}
