import { formatDateTime } from "@/lib/utils";
import type { Store } from "@prisma/client";
import { ShoppingBag, Globe } from "lucide-react";

const platformIcon = {
  SHOPIFY: ShoppingBag,
  AMAZON: Globe,
};

export function StoresList({ stores }: { stores: Store[] }) {
  if (stores.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-6 text-center text-muted-foreground">
        No stores connected yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {stores.map((store) => {
        const Icon = platformIcon[store.platform];
        return (
          <div key={store.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{store.name}</p>
                <p className="text-xs text-muted-foreground">{store.storeUrl}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {store.platform}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Last sync: {store.lastSyncAt ? formatDateTime(store.lastSyncAt) : "Never"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
