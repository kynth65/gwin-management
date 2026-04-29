import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchOrderById } from "@/lib/shopify";
import { appendRowsToSheet } from "@/lib/google-sheets";

const SHEET_IDS: Record<string, string | undefined> = {
  gwin: process.env.GOOGLE_SHEET_GWIN_ID,
  mrcooldirect: process.env.GOOGLE_SHEET_MRCOOLDIRECT_ID,
};

const SHEET_BRANDS: Record<string, string> = {
  gwin: "GWIN",
  mrcooldirect: "MRCOOL",
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sheetType } = (await req.json()) as { sheetType: string };
  const spreadsheetId = SHEET_IDS[sheetType];
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: `Sheet "${sheetType}" is not configured` },
      { status: 400 }
    );
  }

  const dbOrder = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { name: true } } },
  });
  if (!dbOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Attempt to fetch full Shopify order for address/phone — fall back to DB if unavailable
  let shopifyOrder = null;
  try {
    shopifyOrder = await fetchOrderById(dbOrder.externalId, dbOrder.storeId);
  } catch {
    // proceed with DB data only
  }

  type LineItem = { id?: number; title: string; variant_title?: string | null; price: string; sku?: string | null };
  const lineItems: LineItem[] = shopifyOrder
    ? shopifyOrder.line_items
    : (dbOrder.lineItems as unknown as LineItem[]);

  const shipping = shopifyOrder?.shipping_address ?? null;
  const nameParts = dbOrder.customerName.trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const purchaseDate = new Date(dbOrder.createdAt).toLocaleDateString("en-US");
  const brand = SHEET_BRANDS[sheetType] ?? "";

  // One row per line item — mirrors how the spreadsheet is structured
  const rows = lineItems.map((item) => [
    dbOrder.orderNumber,
    "USGWIN371",
    firstName,
    lastName,
    dbOrder.customerEmail,
    shipping?.phone ?? shopifyOrder?.customer?.phone ?? "",
    shipping?.company ?? "",
    [shipping?.address1, shipping?.address2].filter(Boolean).join(", "),
    shipping?.city ?? "",
    shipping?.province ?? "",
    shipping?.zip ?? "",
    item.sku ?? "",
    item.variant_title ? `${item.title} - ${item.variant_title}` : item.title,
    "",
    brand,
    item.price,
    purchaseDate,
    item.price,
  ]);

  await appendRowsToSheet(spreadsheetId, rows);

  await prisma.automationLog.create({
    data: {
      type: "SHEET_EXPORT",
      status: "SUCCESS",
      message: `Added order #${dbOrder.orderNumber} to ${sheetType} sheet (${rows.length} line items)`,
      payload: { orderId: params.id, sheetType, rowCount: rows.length },
    },
  });

  return NextResponse.json({ success: true, rowsAdded: rows.length });
}
