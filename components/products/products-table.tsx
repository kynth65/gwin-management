"use client";

import { useRef, useTransition, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { calcRetailPrice, calcCompareAtPrice } from "@/lib/excel";
import type { Product } from "@prisma/client";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

type ProductWithStore = Product & { store: { id: string; name: string } };

interface Props {
  products: ProductWithStore[];
  stores: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function ProductsTable({ products, stores, total, page, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(total / pageSize);
  const activeStoreId = searchParams.get("storeId") ?? "";

  useEffect(() => {
    setSearchInput(searchParams.get("search") ?? "");
  }, [searchParams]);

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
      const res = await fetch("/api/products", { method: "POST" });
      const data = await res.json() as { synced?: number; fetched?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      const fetched = data.fetched ?? 0;
      const synced = data.synced ?? 0;
      setSyncMsg({
        text: fetched === 0
          ? "No products found in Shopify — check your access token has read_products scope"
          : `Synced ${synced} variant${synced !== 1 ? "s" : ""} from ${fetched} product${fetched !== 1 ? "s" : ""}`,
        ok: fetched > 0,
      });
      router.refresh();
    } catch (err: unknown) {
      setSyncMsg({ text: err instanceof Error ? err.message : "Sync failed", ok: false });
    } finally {
      setSyncing(false);
    }
  };

  const hasActiveFilters = !!(searchParams.get("search") || searchParams.get("status"));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Products</h1>
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
            {syncing ? "Syncing…" : "Sync Products"}
          </button>
        </div>
      </div>

      {/* Store tabs */}
      <div className="flex items-center gap-0 border-b">
        <button
          onClick={() => navigate({ storeId: "" })}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            !activeStoreId
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
          }`}
        >
          All Stores
        </button>
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate({ storeId: s.id })}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeStoreId === s.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search SKU or title…"
          className="px-3 py-2 border rounded-md text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={searchParams.get("status") ?? ""}
          onChange={(e) => navigate({ status: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <select
          value={String(pageSize)}
          onChange={(e) => navigate({ pageSize: e.target.value })}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchInput("");
              const next = new URLSearchParams(searchParams.toString());
              next.delete("search");
              next.delete("status");
              next.delete("page");
              startTransition(() => router.push(`?${next.toString()}`));
            }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {total} {total === 1 ? "product" : "products"}
        </span>
      </div>

      {/* Table */}
      <div className={`bg-card border rounded-lg overflow-hidden transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                {["SKU", "Title", "Cost", "Retail (×2.3)", "Compare-at", "Inventory", "Store", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    {total === 0 && !searchParams.get("search") && !searchParams.get("status")
                      ? "No products yet. Click \"Sync Products\" to pull from Shopify."
                      : "No products match the current filters."}
                  </td>
                </tr>
              ) : (
                products.map((product) => {
                  const cost = Number(product.costPrice ?? 0);
                  const retail = calcRetailPrice(cost);
                  const compareAt = calcCompareAtPrice(retail);
                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono">{product.sku}</td>
                      <td className="px-4 py-3 text-sm max-w-xs">
                        <span className="line-clamp-1">{product.title}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(cost)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(retail)}</td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(compareAt)}</td>
                      <td className="px-4 py-3 text-sm">{product.inventory}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{product.store.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[product.status] ?? ""}`}>
                          {product.status}
                        </span>
                      </td>
                    </tr>
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
