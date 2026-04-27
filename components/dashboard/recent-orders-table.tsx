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
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="border-b bg-muted/40">
            <tr>
              {["Order #", "Customer", "Store", "Total", "Status", "Date"].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-primary">
                  #{order.orderNumber}
                </td>
                <td className="px-4 py-3 text-sm">{order.customerName}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {order.store.name}
                </td>
                <td className="px-4 py-3 text-sm font-medium">
                  {formatCurrency(Number(order.totalPrice))}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
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
