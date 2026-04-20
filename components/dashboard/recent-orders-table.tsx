import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@prisma/client";

type OrderWithStore = Order & { store: { name: string } };

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

export function RecentOrdersTable({ orders }: { orders: OrderWithStore[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
        No orders yet. Sync your store to import orders.
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="border-b bg-muted/50">
          <tr>
            {["Order #", "Customer", "Store", "Total", "Status", "Date"].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 text-sm font-medium">#{order.orderNumber}</td>
              <td className="px-4 py-3 text-sm">{order.customerName}</td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{order.store.name}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(Number(order.totalPrice))}</td>
              <td className="px-4 py-3 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
