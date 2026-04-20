import { schedules } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import { syncProducts, syncOrders } from "@/lib/shopify";

export const shopifySyncTask = schedules.task({
  id: "shopify-sync",
  // Every 6 hours
  cron: "0 */6 * * *",
  run: async () => {
    const stores = await prisma.store.findMany({ where: { platform: "SHOPIFY" } });

    if (stores.length === 0) {
      await prisma.automationLog.create({
        data: {
          type: "SHOPIFY_SYNC",
          status: "FAILED",
          message: "No Shopify stores configured",
        },
      });
      return { synced: 0 };
    }

    let totalProducts = 0;
    let totalOrders = 0;

    for (const store of stores) {
      try {
        const [p, o] = await Promise.all([
          syncProducts(store.id),
          syncOrders(store.id),
        ]);
        totalProducts += p.synced;
        totalOrders += o.synced;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        await prisma.automationLog.create({
          data: {
            type: "SHOPIFY_SYNC",
            status: "FAILED",
            message: `Store ${store.name}: ${message}`,
            payload: { storeId: store.id },
          },
        });
      }
    }

    await prisma.automationLog.create({
      data: {
        type: "SHOPIFY_SYNC",
        status: "SUCCESS",
        message: `Synced ${totalProducts} products and ${totalOrders} orders across ${stores.length} store(s)`,
        payload: { totalProducts, totalOrders },
      },
    });

    return { totalProducts, totalOrders };
  },
});
