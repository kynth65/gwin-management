export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchOrderById } from "@/lib/shopify";
import type { ShopifyOrderDetail, ShopifyLineItemDetail } from "@/lib/shopify";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  Phone,
  Package,
  Tag,
  MessageSquare,
  AlertCircle,
  User,
  Truck,
  CreditCard,
} from "lucide-react";
import { AddToExcelButton } from "@/components/orders/add-to-excel-button";

const financialStatusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  partially_refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  voided: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  authorized: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const fulfillmentColors: Record<string, string> = {
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  partial: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  restocked: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function StatusBadge({ status, colors }: { status: string; colors: Record<string, string> }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${colors[status] ?? "bg-gray-100 text-gray-800"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AddressBlock({ label, address }: {
  label: string;
  address: { first_name?: string; last_name?: string; company?: string; address1?: string; address2?: string; city?: string; province?: string; country?: string; zip?: string; phone?: string } | null;
}) {
  if (!address) return <p className="text-sm text-muted-foreground">Not provided</p>;
  const name = [address.first_name, address.last_name].filter(Boolean).join(" ");
  const line2 = [address.address2, address.city, address.province, address.zip].filter(Boolean).join(", ");
  return (
    <div className="space-y-0.5 text-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {name && <p className="font-medium">{name}</p>}
      {address.company && <p className="text-muted-foreground">{address.company}</p>}
      {address.address1 && <p>{address.address1}</p>}
      {line2 && <p>{line2}</p>}
      {address.country && <p className="text-muted-foreground">{address.country}</p>}
      {address.phone && (
        <p className="flex items-center gap-1 text-muted-foreground mt-1">
          <Phone className="h-3 w-3" />{address.phone}
        </p>
      )}
    </div>
  );
}

function FinancialRow({ label, value, highlight, negative, sub }: {
  label: React.ReactNode;
  value: string;
  highlight?: boolean;
  negative?: boolean;
  sub?: boolean;
}) {
  return (
    <div className={`flex justify-between items-baseline gap-8 ${sub ? "text-xs text-muted-foreground" : "text-sm"}`}>
      <span className={highlight ? "font-semibold" : ""}>{label}</span>
      <span className={`font-medium tabular-nums ${negative ? "text-red-600 dark:text-red-400" : ""} ${highlight ? "text-base font-bold" : ""}`}>
        {negative ? "-" : ""}{value}
      </span>
    </div>
  );
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const dbOrder = await prisma.order.findUnique({
    where: { id: params.id },
    include: { store: { select: { name: true, storeUrl: true } } },
  });

  if (!dbOrder) notFound();

  let shopify: ShopifyOrderDetail | null = null;
  try {
    shopify = await fetchOrderById(dbOrder.externalId);
  } catch {
    // Shopify unavailable — render with DB data only
  }

  const lineItems: ShopifyLineItemDetail[] = shopify
    ? shopify.line_items
    : (dbOrder.lineItems as unknown as ShopifyLineItemDetail[]);

  const shipping = shopify?.shipping_lines.reduce((sum, l) => sum + parseFloat(l.discounted_price || l.price), 0) ?? 0;

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>

        {/* Order header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Order #{dbOrder.orderNumber}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed {formatDateTime(dbOrder.createdAt)}
              {dbOrder.store && (
                <span className="ml-2 text-xs">· {dbOrder.store.name}</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={dbOrder.status} colors={financialStatusColors} />
            {shopify?.fulfillment_status && (
              <StatusBadge status={shopify.fulfillment_status} colors={fulfillmentColors} />
            )}
            {shopify?.cancelled_at && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                Cancelled
              </span>
            )}
            <AddToExcelButton orderId={dbOrder.id} />
          </div>
        </div>

        {/* Shopify unavailable notice */}
        {!shopify && (
          <div className="flex items-center gap-2.5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Full financial breakdown unavailable — could not reach Shopify. Showing synced data only.
          </div>
        )}

        {/* Customer + Addresses */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer */}
          <SectionCard title="Customer" icon={User}>
            <div className="space-y-2 text-sm">
              <p className="font-medium">{dbOrder.customerName}</p>
              {dbOrder.customerEmail && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <a href={`mailto:${dbOrder.customerEmail}`} className="hover:underline truncate">
                    {dbOrder.customerEmail}
                  </a>
                </p>
              )}
              {shopify?.customer?.phone && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {shopify.customer.phone}
                </p>
              )}
              {shopify?.customer && (
                <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                  <p>{shopify.customer.orders_count} previous orders</p>
                  <p>Lifetime value: {formatCurrency(shopify.customer.total_spent)}</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Shipping address */}
          <SectionCard title="Shipping Address" icon={Truck}>
            <AddressBlock
              label=""
              address={shopify?.shipping_address ?? null}
            />
          </SectionCard>

          {/* Billing address */}
          <SectionCard title="Billing Address" icon={CreditCard}>
            <AddressBlock
              label=""
              address={shopify?.billing_address ?? null}
            />
          </SectionCard>
        </div>

        {/* Line items + financial summary */}
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Line Items</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/20">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">SKU</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit Price</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Discount</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {lineItems.map((item, idx) => {
                  const lineTotal = (parseFloat(item.price) * item.quantity) - parseFloat(item.total_discount ?? "0");
                  return (
                    <tr key={item.id ?? idx} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium">{item.title}</p>
                        {item.variant_title && (
                          <p className="text-xs text-muted-foreground mt-0.5">{item.variant_title}</p>
                        )}
                        {item.fulfillment_status && (
                          <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {item.fulfillment_status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm font-mono text-muted-foreground">
                        {item.sku || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-center">{item.quantity}</td>
                      <td className="px-4 py-4 text-sm text-right tabular-nums">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right tabular-nums">
                        {parseFloat(item.total_discount ?? "0") > 0 ? (
                          <span className="text-red-600 dark:text-red-400">
                            -{formatCurrency(item.total_discount)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-right tabular-nums">
                        {formatCurrency(lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Financial summary */}
          <div className="border-t px-5 py-5">
            <div className="flex justify-end">
              <div className="w-full max-w-xs space-y-2">
                {shopify ? (
                  <>
                    <FinancialRow
                      label="Subtotal"
                      value={formatCurrency(shopify.subtotal_price)}
                    />

                    {parseFloat(shopify.total_discounts) > 0 && (
                      <>
                        <FinancialRow
                          label={
                            <span>
                              Discounts
                              {shopify.discount_codes.length > 0 && (
                                <span className="ml-1.5 text-xs font-mono text-muted-foreground">
                                  ({shopify.discount_codes.map(d => d.code).join(", ")})
                                </span>
                              )}
                            </span>
                          }
                          value={formatCurrency(shopify.total_discounts)}
                          negative
                        />
                        {shopify.discount_codes.map(dc => (
                          <FinancialRow
                            key={dc.code}
                            sub
                            label={`${dc.code} (${dc.type === "percentage" ? dc.amount + "%" : formatCurrency(dc.amount)})`}
                            value={""}
                          />
                        ))}
                      </>
                    )}

                    {shopify.shipping_lines.length > 0 && (
                      <FinancialRow
                        label={
                          <span>
                            Shipping
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({shopify.shipping_lines.map(s => s.title).join(", ")})
                            </span>
                          </span>
                        }
                        value={shipping > 0 ? formatCurrency(shipping) : "Free"}
                      />
                    )}

                    {shopify.tax_lines.length > 0 && (
                      <>
                        <FinancialRow
                          label="Tax"
                          value={formatCurrency(shopify.total_tax)}
                        />
                        {shopify.tax_lines.map((tl, i) => (
                          <FinancialRow
                            key={i}
                            sub
                            label={`${tl.title} (${(tl.rate * 100).toFixed(1)}%)`}
                            value={formatCurrency(tl.price)}
                          />
                        ))}
                      </>
                    )}

                    <div className="border-t pt-2 mt-2">
                      <FinancialRow
                        label="Total"
                        value={`${shopify.currency} ${formatCurrency(shopify.total_price)}`}
                        highlight
                      />
                    </div>
                  </>
                ) : (
                  <div className="border-t pt-2">
                    <FinancialRow
                      label="Total"
                      value={formatCurrency(Number(dbOrder.totalPrice))}
                      highlight
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notes, tags, attributes */}
        {(shopify?.note || (shopify?.note_attributes?.length ?? 0) > 0 || shopify?.tags || shopify?.cancel_reason) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shopify?.note && (
              <SectionCard title="Order Notes" icon={MessageSquare}>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{shopify.note}</p>
              </SectionCard>
            )}

            {(shopify?.tags || (shopify?.note_attributes?.length ?? 0) > 0 || shopify?.cancel_reason) && (
              <SectionCard title="Additional Details" icon={Tag}>
                <div className="space-y-3 text-sm">
                  {shopify?.tags && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {shopify.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {(shopify?.note_attributes?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Order Attributes</p>
                      <div className="space-y-1">
                        {shopify!.note_attributes.map(attr => (
                          <div key={attr.name} className="flex justify-between gap-4 text-xs">
                            <span className="text-muted-foreground">{attr.name}</span>
                            <span className="font-medium">{attr.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {shopify?.cancel_reason && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Cancellation Reason</p>
                      <p className="capitalize text-red-600 dark:text-red-400">{shopify.cancel_reason.replace(/_/g, " ")}</p>
                    </div>
                  )}
                </div>
              </SectionCard>
            )}
          </div>
        )}

        {/* Order metadata footer */}
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 pb-6">
          <span>Order ID: {dbOrder.externalId}</span>
          {shopify?.processed_at && <span>Processed: {formatDate(shopify.processed_at)}</span>}
          <span>Store: {dbOrder.store.name}</span>
          {shopify?.currency && <span>Currency: {shopify.currency}</span>}
        </div>

      </div>
    </div>
  );
}
