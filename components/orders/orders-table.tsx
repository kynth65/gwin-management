"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@prisma/client";
import { ChevronDown, ChevronRight } from "lucide-react";

type OrderWithStore = Order & { store: { id: string; name: string } };

interface LineItem {
  title: string;
  quantity: number;
  price: string;
  sku?: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  voided: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function OrdersTable({
  orders,
  stores,
}: {
  orders: OrderWithStore[];
  stores: { id: string; name: string }[];
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [storeFilter, setStoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchStore = !storeFilter || o.store.id === storeFilter;
      const matchStatus = !statusFilter || o.status === statusFilter;
      const matchSearch =
        !search ||
        o.orderNumber.includes(search) ||
        o.customerName.toLowerCase().includes(search.toLowerCase());
      const orderDate = new Date(o.createdAt);
      const matchFrom = !dateFrom || orderDate >= new Date(dateFrom);
      const matchTo = !dateTo || orderDate <= new Date(dateTo + "T23:59:59");
      return matchStore && matchStatus && matchSearch && matchFrom && matchTo;
    });
  }, [orders, storeFilter, statusFilter, search, dateFrom, dateTo]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order # or customer..."
          className="px-3 py-2 border rounded-md text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Stores</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          {["paid", "pending", "refunded", "fulfilled", "voided"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="ml-auto text-sm text-muted-foreground self-center">
          {filtered.length} orders
        </span>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-8 px-4 py-3" />
                {["Order #", "Customer", "Store", "Total", "Status", "Date"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const isExpanded = expandedRows.has(order.id);
                  const lineItems = order.lineItems as LineItem[];
                  return (
                    <>
                      <tr
                        key={order.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleRow(order.id)}
                      >
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </td>
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
                      {isExpanded && (
                        <tr key={`${order.id}-expanded`} className="bg-muted/20">
                          <td colSpan={7} className="px-8 py-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Line Items</p>
                            <div className="space-y-1">
                              {lineItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 text-sm">
                                  <span className="font-medium">{item.quantity}×</span>
                                  <span className="flex-1">{item.title}</span>
                                  {item.sku && <span className="text-muted-foreground text-xs">SKU: {item.sku}</span>}
                                  <span>{formatCurrency(Number(item.price) * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
