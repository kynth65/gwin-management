import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Users who clocked out within 1 hour are "on break"; beyond that is "clocked out"
const BREAK_THRESHOLD_MS = 60 * 60 * 1000;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [users, todayEntries] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.timeEntry.findMany({
      where: { clockIn: { gte: startOfDay } },
      orderBy: { clockIn: "asc" },
    }),
  ]);

  const entriesByUser = new Map<string, typeof todayEntries>();
  for (const entry of todayEntries) {
    if (!entriesByUser.has(entry.userId)) entriesByUser.set(entry.userId, []);
    entriesByUser.get(entry.userId)!.push(entry);
  }

  const nowMs = Date.now();

  const activity = users.map((user) => {
    const entries = entriesByUser.get(user.id) ?? [];
    const openEntry = entries.find((e) => e.clockOut === null);

    if (openEntry) {
      return {
        userId: user.id,
        name: user.name,
        status: "on_clock" as const,
        clockIn: openEntry.clockIn,
        clockOut: null,
        totalMinutes: Math.floor((nowMs - new Date(openEntry.clockIn).getTime()) / 60000),
      };
    }

    if (entries.length > 0) {
      const lastEntry = entries[entries.length - 1];
      const timeSinceLastOut = nowMs - new Date(lastEntry.clockOut!).getTime();
      const totalMinutes = entries.reduce((acc, e) => {
        if (!e.clockOut) return acc;
        return acc + Math.floor((new Date(e.clockOut).getTime() - new Date(e.clockIn).getTime()) / 60000);
      }, 0);

      return {
        userId: user.id,
        name: user.name,
        status: (timeSinceLastOut < BREAK_THRESHOLD_MS ? "on_break" : "clocked_out") as "on_break" | "clocked_out",
        clockIn: entries[0].clockIn,
        clockOut: lastEntry.clockOut,
        totalMinutes,
      };
    }

    return {
      userId: user.id,
      name: user.name,
      status: "not_active" as const,
      clockIn: null,
      clockOut: null,
      totalMinutes: 0,
    };
  });

  return NextResponse.json(activity);
}
