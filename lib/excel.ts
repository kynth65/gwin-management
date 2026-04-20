import * as XLSX from "xlsx";
import { put } from "@vercel/blob";
import { prisma } from "./prisma";
import type { Product, Order } from "@prisma/client";

// HVAC pricing constants
const RETAIL_MULTIPLIER = 2.3;
const COMPARE_AT_MULTIPLIER = 1.2;
const INSTALLATION_COST_PER_UNIT = 144;

export function calcRetailPrice(costPrice: number): number {
  return parseFloat((costPrice * RETAIL_MULTIPLIER).toFixed(2));
}

export function calcCompareAtPrice(retailPrice: number): number {
  return parseFloat((retailPrice * COMPARE_AT_MULTIPLIER).toFixed(2));
}

export function calcAtCostTotal(costPrice: number, units = 1): number {
  return parseFloat((costPrice + INSTALLATION_COST_PER_UNIT * units).toFixed(2));
}

type ProductWithStore = Product & { store: { name: string } };

export async function generateProductsExcel(
  products: ProductWithStore[]
): Promise<Buffer> {
  const headers = [
    "SKU",
    "Title",
    "Cost Price",
    "Retail Price (Cost × 2.3)",
    "Compare-at Price (Retail × 1.2)",
    "At-Cost w/ Install (1 unit)",
    "Inventory",
    "Store",
    "Status",
  ];

  const rows = products.map((p) => {
    const cost = Number(p.costPrice ?? 0);
    const retail = calcRetailPrice(cost);
    const compareAt = calcCompareAtPrice(retail);
    const atCost = calcAtCostTotal(cost);

    return [
      p.sku,
      p.title,
      cost.toFixed(2),
      retail.toFixed(2),
      compareAt.toFixed(2),
      atCost.toFixed(2),
      p.inventory,
      p.store.name,
      p.status,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Column widths
  ws["!cols"] = [
    { wch: 20 }, { wch: 40 }, { wch: 14 }, { wch: 22 },
    { wch: 26 }, { wch: 26 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export async function generateOrdersExcel(orders: (Order & { store: { name: string } })[]): Promise<Buffer> {
  const headers = [
    "Order #",
    "Customer",
    "Email",
    "Total",
    "Status",
    "Store",
    "Date",
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    o.customerName,
    o.customerEmail,
    Number(o.totalPrice).toFixed(2),
    o.status,
    o.store.name,
    new Date(o.createdAt).toLocaleDateString(),
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = [
    { wch: 14 }, { wch: 30 }, { wch: 30 }, { wch: 12 },
    { wch: 14 }, { wch: 20 }, { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Orders");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

export async function uploadAndSaveExport(
  buffer: Buffer,
  fileName: string,
  type: string,
  userId: string
): Promise<string> {
  const blob = await put(fileName, buffer, {
    access: "public",
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  await prisma.excelExport.create({
    data: {
      userId,
      fileName,
      fileUrl: blob.url,
      type,
      status: "DONE",
    },
  });

  return blob.url;
}
