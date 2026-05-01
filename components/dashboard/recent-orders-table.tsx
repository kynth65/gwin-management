import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@prisma/client";

type OrderWithStore = Order & { store: { name: string } };

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  refunded: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  fulfilled: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export function RecentOrdersTable({ orders }: { orders: OrderWithStore[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-10 text-center text-muted-foreground">
        No orders yet. Sync your store to import orders.
      </div>
    );
  }

  return (
    /* overflow-clip trims border-radius corners without creating a scroll container,
       keeping position:sticky on thead functional inside the inner overflow-auto div */
    <div className="bg-card border rounded-xl overflow-clip">
      <div className="overflow-auto max-h-[440px]">
        <table className="w-full min-w-[560px]">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-muted">
              {["Order #", "Customer", "Store", "Total", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-primary border-r border-border">
                  #{order.orderNumber}
                </td>
                <td className="px-4 py-3 text-sm border-r border-border">
                  {order.customerName}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground border-r border-border">
                  {order.store.name}
                </td>
                <td className="px-4 py-3 text-sm font-medium border-r border-border">
                  {formatCurrency(Number(order.totalPrice))}
                </td>
                <td className="px-4 py-3 text-sm border-r border-border">
                  <span
                    className={`inline-flex items-center justify-center min-w-[78px] px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusColors[order.status] ??
                      "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDate(order.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
