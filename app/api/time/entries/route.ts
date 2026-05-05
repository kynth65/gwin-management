import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const targetUserId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Non-admins can only see their own entries
  if ((all || targetUserId) && !session.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = all ? undefined : (targetUserId ?? session.user.id);

  const clockInFilter: { gte?: Date; lte?: Date } = {};
  if (from) clockInFilter.gte = new Date(from);
  if (to) clockInFilter.lte = new Date(to);

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(Object.keys(clockInFilter).length > 0 ? { clockIn: clockInFilter } : {}),
    },
    orderBy: { clockIn: "desc" },
    take: 1000,
    include: { user: { select: { name: true } } },
  });

  return NextResponse.json(entries);
}
