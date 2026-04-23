export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/products/products-table";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getProducts() {
  return prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { store: { select: { id: true, name: true } } },
  });
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

async function ProductsContent() {
  const [products, stores] = await Promise.all([getProducts(), getStores()]);
  return <ProductsTable products={products} stores={stores} />;
}

export default async function ProductsPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <Suspense fallback={<TableSkeleton rows={12} />}>
        <ProductsContent />
      </Suspense>
    </div>
  );
}
