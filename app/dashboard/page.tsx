export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/header";
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

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Suspense fallback={<div className="grid grid-cols-1 md:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>}>
          <DashboardCards
            totalProducts={data.totalProducts}
            totalOrders={data.totalOrders}
            pendingExports={data.pendingExports}
            lastSyncAt={data.lastSyncAt}
          />
        </Suspense>

        <QuickActions />

        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
          <Suspense fallback={<TableSkeleton />}>
            <RecentOrdersTable orders={data.recentOrders} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
