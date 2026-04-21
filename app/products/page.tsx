export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/header";
import { ProductsTable } from "@/components/products/products-table";

async function getProducts() {
  return prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { store: { select: { id: true, name: true } } },
  });
}

async function getStores() {
  return prisma.store.findMany({ select: { id: true, name: true } });
}

export default async function ProductsPage() {
  const [products, stores] = await Promise.all([getProducts(), getStores()]);

  return (
    <>
      <Header title="Products" />
      <div className="flex-1 p-6 overflow-auto">
        <ProductsTable products={products} stores={stores} />
      </div>
    </>
  );
}
