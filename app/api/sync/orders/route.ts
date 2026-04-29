import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOrders } from "@/lib/shopify";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stores = await prisma.store.findMany({ where: { platform: "SHOPIFY" } });

  if (stores.length === 0) {
    return NextResponse.json(
      { error: "No Shopify stores configured. Add a store in Settings first." },
      { status: 400 }
    );
  }

  // Run all stores concurrently; allSettled so one failing store doesn't abort the others.
  const settled = await Promise.allSettled(
    stores.map(async (store) => {
      const result = await syncOrders(store.id);
      await prisma.store.update({
        where: { id: store.id },
        data: { lastSyncAt: new Date() },
      });
      return { storeId: store.id, storeName: store.name, synced: result.synced };
    })
  );

  let totalSynced = 0;
  const results: { storeId: string; storeName: string; synced: number }[] = [];
  const errors: { storeName: string; error: string }[] = [];

  settled.forEach((item, i) => {
    if (item.status === "fulfilled") {
      totalSynced += item.value.synced;
      results.push(item.value);
    } else {
      errors.push({
        storeName: stores[i].name,
        error: item.reason instanceof Error ? item.reason.message : "Sync failed",
      });
    }
  });

  if (errors.length > 0 && results.length === 0) {
    return NextResponse.json(
      { error: errors.map((e) => `${e.storeName}: ${e.error}`).join("; ") },
      { status: 500 }
    );
  }

  return NextResponse.json({ synced: totalSynced, stores: results, errors });
}
