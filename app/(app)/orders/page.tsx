export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { OrdersTable } from "@/components/orders/orders-table";
import { TableSkeleton } from "@/components/shared/skeletons";

const DEFAULT_PAGE_SIZE = 20;

type SearchParams = { [key: string]: string | string[] | undefined };

function p(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

async function getOrders(params: SearchParams) {
  const page = Math.max(1, parseInt(p(params, "page") || "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(p(params, "pageSize") || String(DEFAULT_PAGE_SIZE))));
  const skip = (page - 1) * pageSize;

  const where: Prisma.OrderWhereInput = {};

  const storeId = p(params, "storeId");
  const status = p(params, "status");
  const search = p(params, "search");
  const dateFrom = p(params, "dateFrom");
  const dateTo = p(params, "dateTo");

  if (storeId) where.storeId = storeId;
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { orderNumber: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: { store: { select: { id: true, name: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total, page, pageSize };
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

async function OrdersContent({ searchParams }: { searchParams: SearchParams }) {
  const [{ orders, total, page, pageSize }, stores] = await Promise.all([
    getOrders(searchParams),
    getStores(),
  ]);
  return (
    <OrdersTable
      orders={orders}
      stores={stores}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
