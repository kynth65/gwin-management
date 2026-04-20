import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  generateProductsExcel,
  generateOrdersExcel,
  uploadAndSaveExport,
} from "@/lib/excel";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exports = await prisma.excelExport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(exports);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, ids } = await req.json();
  const userId = (session.user as { id: string }).id;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  try {
    if (type === "products") {
      const products = await prisma.product.findMany({
        where: ids ? { id: { in: ids } } : {},
        include: { store: { select: { name: true } } },
        orderBy: { sku: "asc" },
      });

      const buffer = await generateProductsExcel(products);
      const fileName = `products-${timestamp}.xlsx`;
      const url = await uploadAndSaveExport(buffer, fileName, "products", userId);

      await prisma.automationLog.create({
        data: {
          type: "EXCEL_EXPORT",
          status: "SUCCESS",
          message: `Exported ${products.length} products to Excel`,
          payload: { fileName, count: products.length },
        },
      });

      return NextResponse.json({ url, count: products.length });
    }

    if (type === "orders") {
      const orders = await prisma.order.findMany({
        include: { store: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });

      const buffer = await generateOrdersExcel(orders);
      const fileName = `orders-${timestamp}.xlsx`;
      const url = await uploadAndSaveExport(buffer, fileName, "orders", userId);

      await prisma.automationLog.create({
        data: {
          type: "EXCEL_EXPORT",
          status: "SUCCESS",
          message: `Exported ${orders.length} orders to Excel`,
          payload: { fileName, count: orders.length },
        },
      });

      return NextResponse.json({ url, count: orders.length });
    }

    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    await prisma.automationLog.create({
      data: { type: "EXCEL_EXPORT", status: "FAILED", message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
