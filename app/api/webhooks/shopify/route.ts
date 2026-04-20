import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";
import type { ShopifyOrder, ShopifyProduct } from "@/lib/shopify";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-shopify-hmac-sha256") ?? "";
  const topic = req.headers.get("x-shopify-topic") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const store = await prisma.store.findFirst({ where: { platform: "SHOPIFY" } });
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const payload = JSON.parse(rawBody);

  try {
    if (topic === "orders/create" || topic === "orders/updated") {
      const order = payload as ShopifyOrder;
      const customerName = order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
        : "Guest";

      await prisma.order.upsert({
        where: { externalId_storeId: { externalId: String(order.id), storeId: store.id } } as never,
        update: {
          customerName,
          customerEmail: order.email || "",
          totalPrice: parseFloat(order.total_price),
          status: order.financial_status,
          lineItems: order.line_items as never,
        },
        create: {
          storeId: store.id,
          externalId: String(order.id),
          orderNumber: String(order.order_number),
          customerName,
          customerEmail: order.email || "",
          totalPrice: parseFloat(order.total_price),
          status: order.financial_status,
          lineItems: order.line_items as never,
        },
      });
    }

    if (topic === "products/update" || topic === "products/create") {
      const product = payload as ShopifyProduct;
      for (const variant of product.variants) {
        await prisma.product.upsert({
          where: { externalId_storeId: { externalId: String(variant.id), storeId: store.id } } as never,
          update: {
            title: product.title,
            sku: variant.sku || `VAR-${variant.id}`,
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            inventory: variant.inventory_quantity,
            status: product.status === "active" ? "ACTIVE" : product.status === "draft" ? "DRAFT" : "ARCHIVED",
            updatedAt: new Date(),
          },
          create: {
            storeId: store.id,
            externalId: String(variant.id),
            title: product.title,
            sku: variant.sku || `VAR-${variant.id}`,
            price: parseFloat(variant.price),
            compareAtPrice: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
            inventory: variant.inventory_quantity,
            status: product.status === "active" ? "ACTIVE" : product.status === "draft" ? "DRAFT" : "ARCHIVED",
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
