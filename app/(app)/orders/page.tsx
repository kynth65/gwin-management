export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { OrdersTable } from "@/components/orders/orders-table";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { store: { select: { id: true, name: true } } },
  });
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

async function OrdersContent() {
  const [orders, stores] = await Promise.all([getOrders(), getStores()]);
  return <OrdersTable orders={orders} stores={stores} />;
}

export default async function OrdersPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <OrdersContent />
      </Suspense>
    </div>
  );
}
