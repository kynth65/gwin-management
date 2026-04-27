export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CardSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { formatDateTime } from "@/lib/utils";

async function getDashboardData() {
  const [totalProducts, totalOrders, pendingExports, recentOrders, lastSync] =
    await Promise.all([
      prisma.product.count(),
      prisma.order.count(),
      prisma.excelExport.count({ where: { status: "PENDING" } }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { store: { select: { name: true } } },
      }),
      prisma.store.findFirst({
        orderBy: { lastSyncAt: "desc" },
        select: { lastSyncAt: true },
      }),
    ]);

  return {
    totalProducts,
    totalOrders,
    pendingExports,
    recentOrders,
    lastSyncAt: lastSync?.lastSyncAt ? formatDateTime(lastSync.lastSyncAt) : "Never",
  };
}

async function DashboardContent() {
  const data = await getDashboardData();
  return (
    <>
      <DashboardCards
        totalProducts={data.totalProducts}
        totalOrders={data.totalOrders}
        pendingExports={data.pendingExports}
        lastSyncAt={data.lastSyncAt}
      />
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <QuickActions />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        <RecentOrdersTable orders={data.recentOrders} />
      </div>
    </>
  );
}

export default async function DashboardPage() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto">
      <Suspense
        fallback={
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
            </div>
            <TableSkeleton rows={8} />
          </>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
