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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export async function fetchOrderById(orderId: string): Promise<ShopifyOrderDetail> {
  const data = await shopifyFetch<{ order: ShopifyOrderDetail }>(
    `orders/${orderId}.json`
  );
  return data.order;
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
        createdAt: new Date(order.created_at),
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
