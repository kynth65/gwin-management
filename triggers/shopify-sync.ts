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

    // Sync all stores concurrently; products + orders run in parallel per store.
    const settled = await Promise.allSettled(
      stores.map(async (store) => {
        const [p, o] = await Promise.all([syncProducts(store.id), syncOrders(store.id)]);
        return { storeName: store.name, products: p.synced, orders: o.synced };
      })
    );

    const syncErrors: { storeName: string; error: string }[] = [];

    settled.forEach((item, i) => {
      if (item.status === "fulfilled") {
        totalProducts += item.value.products;
        totalOrders += item.value.orders;
      } else {
        syncErrors.push({
          storeName: stores[i].name,
          error: item.reason instanceof Error ? item.reason.message : "Sync failed",
        });
      }
    });

    if (syncErrors.length > 0) {
      await Promise.all(
        syncErrors.map((e) =>
          prisma.automationLog.create({
            data: {
              type: "SHOPIFY_SYNC",
              status: "FAILED",
              message: `Store ${e.storeName}: ${e.error}`,
            },
          })
        )
      );
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
