import { prisma } from "@/lib/prisma";
import { Header } from "@/components/shared/header";
import { StoresList } from "@/components/settings/stores-list";
import { AddStoreForm } from "@/components/settings/add-store-form";

async function getStores() {
  return prisma.store.findMany({ orderBy: { createdAt: "desc" } });
}

export default async function SettingsPage() {
  const stores = await getStores();

  return (
    <>
      <Header title="Settings" />
      <div className="flex-1 p-6 space-y-8 overflow-auto max-w-3xl">
        <div>
          <h2 className="text-lg font-semibold mb-4">Connected Stores</h2>
          <StoresList stores={stores} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-4">Add Shopify Store</h2>
          <AddStoreForm />
        </div>
      </div>
    </>
  );
}
