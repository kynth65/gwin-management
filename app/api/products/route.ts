import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { syncProducts, syncOrders } from "@/lib/shopify";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    include: { store: { select: { name: true } } },
  });

  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const store = await prisma.store.findFirst({ where: { platform: "SHOPIFY" } });
  if (!store) {
    return NextResponse.json({ error: "No Shopify store connected" }, { status: 400 });
  }

  try {
    const [productResult, orderResult] = await Promise.all([
      syncProducts(store.id),
      syncOrders(store.id),
    ]);

    await prisma.automationLog.create({
      data: {
        type: "SHOPIFY_SYNC",
        status: "SUCCESS",
        message: `Synced ${productResult.synced} products and ${orderResult.synced} orders`,
        payload: { productResult, orderResult },
      },
    });

    return NextResponse.json({ success: true, ...productResult });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.automationLog.create({
      data: {
        type: "SHOPIFY_SYNC",
        status: "FAILED",
        message,
      },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
