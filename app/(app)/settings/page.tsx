export const dynamic = "force-dynamic";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { StoresList } from "@/components/settings/stores-list";
import { AddStoreForm } from "@/components/settings/add-store-form";
import { CustomizationForm } from "@/components/customization/customization-form";
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
    <div className="flex-1 p-6 overflow-auto">
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your business configuration and connected stores.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          {/* Left column: Customization */}
          <div>
            <h2 className="text-lg font-semibold mb-1">Customization</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set your business name, icon, and brand color. Changes apply instantly across the app.
            </p>
            <CustomizationForm />
          </div>

          {/* Right column: Stores */}
          <div className="space-y-8">
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
        </div>
      </div>
    </div>
  );
}
