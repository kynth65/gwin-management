import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncOrders } from "@/lib/shopify";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!storeUrl || !accessToken) {
    return NextResponse.json(
      { error: "SHOPIFY_STORE_URL and SHOPIFY_ACCESS_TOKEN must be set in environment" },
      { status: 400 }
    );
  }

  let store = await prisma.store.findFirst({ where: { platform: "SHOPIFY" } });

  if (!store) {
    store = await prisma.store.create({
      data: { name: storeUrl, platform: "SHOPIFY", storeUrl, accessToken },
    });
  }

  const result = await syncOrders(store.id);

  await prisma.store.update({
    where: { id: store.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json({ synced: result.synced, storeId: store.id });
}
