import { task } from "@trigger.dev/sdk/v3";
import { prisma } from "@/lib/prisma";
import {
  generateProductsExcel,
  generateOrdersExcel,
  uploadAndSaveExport,
} from "@/lib/excel";

interface ExcelExportPayload {
  type: "products" | "orders";
  userId: string;
  exportId: string;
}

export const excelExportTask = task({
  id: "excel-export",
  run: async (payload: ExcelExportPayload) => {
    const { type, userId, exportId } = payload;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    try {
      let url: string;
      let count: number;

      if (type === "products") {
        const products = await prisma.product.findMany({
          include: { store: { select: { name: true } } },
          orderBy: { sku: "asc" },
        });
        const buffer = await generateProductsExcel(products);
        const fileName = `products-${timestamp}.xlsx`;
        url = await uploadAndSaveExport(buffer, fileName, type, userId);
        count = products.length;
      } else {
        const orders = await prisma.order.findMany({
          include: { store: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });
        const buffer = await generateOrdersExcel(orders);
        const fileName = `orders-${timestamp}.xlsx`;
        url = await uploadAndSaveExport(buffer, fileName, type, userId);
        count = orders.length;
      }

      await prisma.excelExport.update({
        where: { id: exportId },
        data: { status: "DONE", fileUrl: url },
      });

      await prisma.automationLog.create({
        data: {
          type: "EXCEL_EXPORT",
          status: "SUCCESS",
          message: `Background export complete: ${count} ${type}`,
          payload: { exportId, count, url },
        },
      });

      return { url, count };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";

      await prisma.excelExport.update({
        where: { id: exportId },
        data: { status: "FAILED" },
      });

      await prisma.automationLog.create({
        data: { type: "EXCEL_EXPORT", status: "FAILED", message },
      });

      throw err;
    }
  },
});
