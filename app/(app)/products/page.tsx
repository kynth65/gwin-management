export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, ProductStatus } from "@prisma/client";
import { ProductsTable } from "@/components/products/products-table";
import { TableSkeleton } from "@/components/shared/skeletons";

const DEFAULT_PAGE_SIZE = 20;

type SearchParams = { [key: string]: string | string[] | undefined };

function p(params: SearchParams, key: string): string {
  const v = params[key];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

async function getProducts(params: SearchParams) {
  const page = Math.max(1, parseInt(p(params, "page") || "1"));
  const pageSize = Math.min(100, Math.max(10, parseInt(p(params, "pageSize") || String(DEFAULT_PAGE_SIZE))));
  const skip = (page - 1) * pageSize;

  const where: Prisma.ProductWhereInput = {};
  const storeId = p(params, "storeId");
  const status = p(params, "status");
  const search = p(params, "search");

  if (storeId) where.storeId = storeId;
  if (status && Object.values(ProductStatus).includes(status as ProductStatus)) {
    where.status = status as ProductStatus;
  }
  if (search) {
    where.OR = [
      { sku: { contains: search, mode: "insensitive" } },
      { title: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: pageSize,
      include: { store: { select: { id: true, name: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pageSize };
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

async function ProductsContent({ searchParams }: { searchParams: SearchParams }) {
  const [{ products, total, page, pageSize }, stores] = await Promise.all([
    getProducts(searchParams),
    getStores(),
  ]);
  return (
    <ProductsTable
      products={products}
      stores={stores}
      total={total}
      page={page}
      pageSize={pageSize}
    />
  );
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <ProductsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
