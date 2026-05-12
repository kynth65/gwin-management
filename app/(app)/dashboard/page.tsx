export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardCards as DashboardCardsUI } from "@/components/dashboard/dashboard-cards";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { WhatsNewFeed } from "@/components/dashboard/whats-new-feed";
import { CardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { formatDateTime } from "@/lib/utils";
import type { AnnouncementWithAuthor } from "@/types";

async function getCardStats(userId: string, isAdmin: boolean) {
  const [totalOrders, lastSync, overdueTasks] = await Promise.all([
    prisma.order.count(),
    prisma.store.findFirst({
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true },
    }),
    prisma.task.count({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: ["COMPLETED", "POSTPONED"] },
        deletedAt: null,
        ...(isAdmin ? {} : { assigneeId: userId }),
      },
    }),
  ]);
  return {
    totalOrders,
    lastSyncAt: lastSync?.lastSyncAt ? formatDateTime(lastSync.lastSyncAt) : "Never",
    overdueTasks,
  };
}

async function getRecentOrders() {
  return prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { store: { select: { name: true } } },
  });
}

async function getAnnouncements(): Promise<AnnouncementWithAuthor[]> {
  return prisma.announcement.findMany({
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: { author: { select: { id: true, name: true } } },
  }) as unknown as Promise<AnnouncementWithAuthor[]>;
}

async function CardSection() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? "";
  const isAdmin = session?.user?.isAdmin === true;
  const stats = await getCardStats(userId, isAdmin);
  return (
    <DashboardCardsUI
      totalOrders={stats.totalOrders}
      lastSyncAt={stats.lastSyncAt}
      overdueTasks={stats.overdueTasks}
    />
  );
}

async function DashboardTable() {
  const orders = await getRecentOrders();
  return <RecentOrdersTable orders={orders} />;
}

async function DashboardFeed() {
  const announcements = await getAnnouncements();
  return <WhatsNewFeed initialAnnouncements={announcements} />;
}

export default async function DashboardPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
      {/* Cards stream in first — cheapest queries */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        }
      >
        <CardSection />
      </Suspense>

      {/* Table + feed stream independently */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <Suspense fallback={<TableSkeleton rows={8} />}>
            <DashboardTable />
          </Suspense>
        </div>
        <div>
          <Suspense fallback={<div className="h-48 rounded-xl border animate-pulse bg-muted/30" />}>
            <DashboardFeed />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
