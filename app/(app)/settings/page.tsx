export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { StoresList } from "@/components/settings/stores-list";
import { AddStoreForm } from "@/components/settings/add-store-form";
import { TableSkeleton } from "@/components/shared/skeletons";

async function getStores() {
  return prisma.store.findMany({ orderBy: { createdAt: "desc" } });
}

async function StoresContent() {
  const stores = await getStores();
  return <StoresList stores={stores} />;
}

export default async function SettingsPage() {
  return (
    <div className="flex-1 p-6 space-y-8 overflow-auto max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold mb-4">Connected Stores</h2>
        <Suspense fallback={<TableSkeleton rows={3} />}>
          <StoresContent />
        </Suspense>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-4">Add Shopify Store</h2>
        <AddStoreForm />
      </div>
    </div>
  );
}
