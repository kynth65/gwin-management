import crypto from "crypto";

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
  fulfillment_status: string | null;
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

export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
}

export interface ShopifyTaxLine {
  title: string;
  price: string;
  rate: number;
}

export interface ShopifyShippingLine {
  title: string;
  code: string | null;
  price: string;
  discounted_price: string;
}

export interface ShopifyDiscountCode {
  code: string;
  amount: string;
  type: string;
}

export interface ShopifyLineItemDetail {
  id: number;
  title: string;
  variant_title?: string | null;
  quantity: number;
  price: string;
  sku: string;
  total_discount: string;
  tax_lines: ShopifyTaxLine[];
  discount_allocations: { amount: string }[];
  product_id?: number | null;
  variant_id?: number | null;
  fulfillment_status?: string | null;
}

export interface ShopifyOrderDetail {
  id: number;
  order_number: number;
  name: string;
  email: string;
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    orders_count: number;
    total_spent: string;
  } | null;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  total_shipping_price_set: {
    shop_money: { amount: string; currency_code: string };
  } | null;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItemDetail[];
  shipping_lines: ShopifyShippingLine[];
  tax_lines: ShopifyTaxLine[];
  discount_codes: ShopifyDiscountCode[];
  note: string | null;
  note_attributes: { name: string; value: string }[];
  billing_address: ShopifyAddress | null;
  shipping_address: ShopifyAddress | null;
  tags: string;
  created_at: string;
  processed_at: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
}

// Parses Shopify's Link header to get the next page cursor URL.
// Format: <https://...?page_info=xxx>; rel="next"
function parseLinkNext(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

export async function fetchOrderById(orderId: string, storeId: string): Promise<ShopifyOrderDetail> {
  const { prisma } = await import("./prisma");
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store not found: ${storeId}`);
  const res = await fetch(
    `https://${store.storeUrl}/admin/api/${API_VERSION}/orders/${orderId}.json`,
    {
      headers: { "X-Shopify-Access-Token": store.accessToken },
      signal: AbortSignal.timeout(10000),
    }
  );
  if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
  const data = await res.json() as { order: ShopifyOrderDetail };
  return data.order;
}

export async function syncProducts(storeId: string): Promise<{ synced: number; fetched: number }> {
  const { prisma } = await import("./prisma");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store not found: ${storeId}`);

  // Paginate through all products using Shopify's cursor-based Link header.
  const allProducts: ShopifyProduct[] = [];
  let nextUrl: string | null =
    `https://${store.storeUrl}/admin/api/${API_VERSION}/products.json?limit=250&status=any`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": store.accessToken },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
    const data = await res.json() as { products?: ShopifyProduct[]; errors?: unknown };
    if (!data.products) {
      throw new Error(
        `Shopify did not return a products array. This usually means the access token is missing the "read_products" scope. Response: ${JSON.stringify(data)}`
      );
    }
    allProducts.push(...data.products);
    nextUrl = parseLinkNext(res.headers.get("link"));
  }

  const fetched = allProducts.length;
  let synced = 0;

  for (const product of allProducts) {
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

  return { synced, fetched };
}

export async function syncOrders(storeId: string): Promise<{ synced: number }> {
  const { prisma } = await import("./prisma");

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) throw new Error(`Store not found: ${storeId}`);

  // Delta sync: only request orders changed since the last successful sync.
  // On first run (lastSyncAt is null), fetch all orders.
  const params = new URLSearchParams({ limit: "250", status: "any" });
  if (store.lastSyncAt) {
    params.set("updated_at_min", store.lastSyncAt.toISOString());
  }

  // Paginate through all result pages using Shopify's cursor-based Link header.
  const orders: ShopifyOrder[] = [];
  let nextUrl: string | null =
    `https://${store.storeUrl}/admin/api/${API_VERSION}/orders.json?${params}`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { "X-Shopify-Access-Token": store.accessToken },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`Shopify API error: ${res.status} ${res.statusText}`);
    const data = await res.json() as { orders: ShopifyOrder[] };
    orders.push(...data.orders);
    nextUrl = parseLinkNext(res.headers.get("link"));
  }

  if (orders.length === 0) return { synced: 0 };

  // Batch all upserts into a single DB transaction instead of N sequential round-trips.
  await prisma.$transaction(
    orders.map((order) => {
      const customerName = order.customer
        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
        : "Guest";
      return prisma.order.upsert({
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
          createdAt: new Date(order.created_at),
        },
      });
    })
  );

  return { synced: orders.length };
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
