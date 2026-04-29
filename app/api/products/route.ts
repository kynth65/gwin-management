import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncProducts } from "@/lib/shopify";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { store: { select: { name: true } } },
  });

  return NextResponse.json(products);
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stores = await prisma.store.findMany({ where: { platform: "SHOPIFY" } });
  if (stores.length === 0) {
    return NextResponse.json({ error: "No Shopify stores connected" }, { status: 400 });
  }

  // Sync all stores concurrently; allSettled so one failing store doesn't abort the others.
  const settled = await Promise.allSettled(
    stores.map((store) => syncProducts(store.id).then((r) => ({ ...r, storeName: store.name })))
  );

  let totalSynced = 0;
  let totalFetched = 0;
  const errors: string[] = [];

  settled.forEach((item, i) => {
    if (item.status === "fulfilled") {
      totalSynced += item.value.synced;
      totalFetched += item.value.fetched;
    } else {
      errors.push(`${stores[i].name}: ${item.reason instanceof Error ? item.reason.message : "Sync failed"}`);
    }
  });

  await prisma.automationLog.create({
    data: {
      type: "SHOPIFY_SYNC",
      status: errors.length > 0 && totalFetched === 0 ? "FAILED" : "SUCCESS",
      message: errors.length > 0
        ? `Partial sync — errors: ${errors.join("; ")}`
        : `Fetched ${totalFetched} products, synced ${totalSynced} variants across ${stores.length} store(s)`,
    },
  });

  if (errors.length > 0 && totalFetched === 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
  }

  return NextResponse.json({ success: true, synced: totalSynced, fetched: totalFetched, errors });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, price } = await req.json();
  if (!id || price === undefined) {
    return NextResponse.json({ error: "Missing id or price" }, { status: 400 });
  }

  const product = await prisma.product.update({
    where: { id },
    data: { price },
  });

  return NextResponse.json(product);
}
