"use client";

import { Fragment, useState, useRef, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Order } from "@prisma/client";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronLeft, RefreshCw, Eye } from "lucide-react";

type OrderWithStore = Order & { store: { id: string; name: string } };

interface LineItem {
  title: string;
  quantity: number;
  price: string;
  sku?: string;
}

interface Props {
  orders: OrderWithStore[];
  stores: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  refunded: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  voided: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  partially_refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function OrdersTable({ orders, stores, total, page, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  // Clear expanded rows when the page of orders changes
  useEffect(() => {
    setExpandedRows(new Set());
  }, [orders]);

  // Keep search input in sync with URL (e.g. back navigation)
  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

  // Build a new URL by merging current params with overrides; always resets page
  const navigate = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.push(`?${next.toString()}`));
  };

  const goToPage = (p: number) => {
    const next = new URLSearchParams(searchParams.toString());
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    startTransition(() => router.push(`?${next.toString()}`));
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => navigate({ search: value }), 400);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync/orders", { method: "POST" });
      const data = await res.json() as { synced?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setSyncMsg({ text: `Synced ${data.synced} orders`, ok: true });
      router.refresh();
    } catch (err: unknown) {
      setSyncMsg({ text: err instanceof Error ? err.message : "Sync failed", ok: false });
    } finally {
      setSyncing(false);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Orders</h1>
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className={`text-sm ${syncMsg.ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {syncMsg.text}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync Orders"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search order # or customer…"
          className="px-3 py-2 border rounded-md text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={searchParams.get("storeId") ?? ""}
          onChange={(e) => navigate({ storeId: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => navigate({ status: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          {["paid", "pending", "refunded", "partially_refunded", "fulfilled", "voided"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        <input
          type="date"
          value={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => navigate({ dateFrom: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <input
          type="date"
          value={searchParams.get("dateTo") ?? ""}
          onChange={(e) => navigate({ dateTo: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={String(pageSize)}
          onChange={(e) => navigate({ pageSize: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        {(searchParams.get("search") || searchParams.get("status") || searchParams.get("storeId") || searchParams.get("dateFrom") || searchParams.get("dateTo")) && (
          <button
            onClick={() => {
              setSearchInput("");
              startTransition(() => router.push("?"));
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} {total === 1 ? "order" : "orders"}
        </span>
      </div>

      {/* Table */}
      <div className={`bg-card border rounded-lg overflow-hidden transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
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
                <th className="w-16 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {total === 0 && !searchParams.get("search") && !searchParams.get("status")
                      ? "No orders yet. Click \"Sync Orders\" to pull from Shopify."
                      : "No orders match the current filters."}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedRows.has(order.id);
                  const lineItems = order.lineItems as unknown as LineItem[];
                  return (
                    <Fragment key={order.id}>
                      <tr
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => toggleRow(order.id)}
                      >
                        <td className="px-4 py-3">
                          {isExpanded
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">#{order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm">
                          <div>{order.customerName}</div>
                          {order.customerEmail && (
                            <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{order.store.name}</td>
                        <td className="px-4 py-3 text-sm font-medium">{formatCurrency(Number(order.totalPrice))}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}>
                            {order.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </Link>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/20">
                          <td colSpan={8} className="px-8 py-4">
                            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Line Items</p>
                            <div className="space-y-1.5">
                              {lineItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 text-sm">
                                  <span className="font-medium w-6 text-right">{item.quantity}×</span>
                                  <span className="flex-1">{item.title}</span>
                                  {item.sku && (
                                    <span className="text-muted-foreground text-xs font-mono">
                                      {item.sku}
                                    </span>
                                  )}
                                  <span className="font-medium">{formatCurrency(Number(item.price) * item.quantity)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                disabled={page <= 1}
                className="px-2 py-1.5 border rounded-md text-xs disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                First
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-1.5 border rounded-md disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm px-3 py-1.5 border rounded-md bg-muted/30">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-1.5 border rounded-md disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={page >= totalPages}
                className="px-2 py-1.5 border rounded-md text-xs disabled:opacity-40 hover:bg-muted/50 transition-colors"
              >
                Last
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
