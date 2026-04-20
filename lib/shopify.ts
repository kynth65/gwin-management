import crypto from "crypto";

const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET!;
const API_VERSION = "2024-10";

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: ShopifyVariant[];
  status: string;
}

export interface ShopifyVariant {
  id: number;
  sku: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
}

export interface ShopifyOrder {
  id: number;
  order_number: number;
  email: string;
  customer: { first_name: string; last_name: string } | null;
  total_price: string;
  financial_status: string;
  line_items: ShopifyLineItem[];
  created_at: string;
}

export interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  sku: string;
}

async function shopifyFetch<T>(endpoint: string): Promise<T> {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

async function shopifyMutate<T>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown
): Promise<T> {
  const url = `https://${SHOPIFY_STORE_URL}/admin/api/${API_VERSION}/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchProducts(limit = 250): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch<{ products: ShopifyProduct[] }>(
    `products.json?limit=${limit}&status=any`
  );
  return data.products;
}

export async function fetchOrders(limit = 250): Promise<ShopifyOrder[]> {
  const data = await shopifyFetch<{ orders: ShopifyOrder[] }>(
    `orders.json?limit=${limit}&status=any`
  );
  return data.orders;
}

export async function syncProducts(storeId: string): Promise<{ synced: number }> {
  const { prisma } = await import("./prisma");
  const products = await fetchProducts();

  let synced = 0;
  for (const product of products) {
    for (const variant of product.variants) {
      await prisma.product.upsert({
        where: { externalId_storeId: { externalId: String(variant.id), storeId } } as never,
        update: {
          title: product.title,
          sku: variant.sku || `VAR-${variant.id}`,
          price: parseFloat(variant.price),
          compareAtPrice: variant.compare_at_price
            ? parseFloat(variant.compare_at_price)
            : null,
          inventory: variant.inventory_quantity,
          status: product.status === "active" ? "ACTIVE" : product.status === "draft" ? "DRAFT" : "ARCHIVED",
          updatedAt: new Date(),
        },
        create: {
          storeId,
          externalId: String(variant.id),
          title: product.title,
          sku: variant.sku || `VAR-${variant.id}`,
          price: parseFloat(variant.price),
          compareAtPrice: variant.compare_at_price
            ? parseFloat(variant.compare_at_price)
            : null,
          inventory: variant.inventory_quantity,
          status: product.status === "active" ? "ACTIVE" : product.status === "draft" ? "DRAFT" : "ARCHIVED",
        },
      });
      synced++;
    }
  }

  await prisma.store.update({
    where: { id: storeId },
    data: { lastSyncAt: new Date() },
  });

  return { synced };
}

export async function syncOrders(storeId: string): Promise<{ synced: number }> {
  const { prisma } = await import("./prisma");
  const orders = await fetchOrders();

  let synced = 0;
  for (const order of orders) {
    const customerName = order.customer
      ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
      : "Guest";

    await prisma.order.upsert({
      where: { externalId_storeId: { externalId: String(order.id), storeId } } as never,
      update: {
        orderNumber: String(order.order_number),
        customerName,
        customerEmail: order.email || "",
        totalPrice: parseFloat(order.total_price),
        status: order.financial_status,
        lineItems: order.line_items as never,
      },
      create: {
        storeId,
        externalId: String(order.id),
        orderNumber: String(order.order_number),
        customerName,
        customerEmail: order.email || "",
        totalPrice: parseFloat(order.total_price),
        status: order.financial_status,
        lineItems: order.line_items as never,
      },
    });
    synced++;
  }

  return { synced };
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}
