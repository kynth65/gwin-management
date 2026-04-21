export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/header";
import { OrdersTable } from "@/components/orders/orders-table";

async function getOrders() {
  return prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { store: { select: { id: true, name: true } } },
  });
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

export default async function OrdersPage() {
  const [orders, stores] = await Promise.all([getOrders(), getStores()]);

  return (
    <>
      <Header title="Orders" />
      <div className="flex-1 p-6 overflow-auto">
        <OrdersTable orders={orders} stores={stores} />
      </div>
    </>
  );
}
