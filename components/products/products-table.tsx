"use client";

import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";
import { calcRetailPrice, calcCompareAtPrice } from "@/lib/excel";
import type { Product } from "@prisma/client";
import { ArrowUpDown } from "lucide-react";

type ProductWithStore = Product & { store: { id: string; name: string } };

export function ProductsTable({
  products,
  stores,
}: {
  products: ProductWithStore[];
  stores: { id: string; name: string }[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const columns = useMemo<ColumnDef<ProductWithStore>[]>(
    () => [
      {
        accessorKey: "sku",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting()}
          >
            SKU <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
      },
      { accessorKey: "title", header: "Title", size: 300 },
      {
        accessorKey: "costPrice",
        header: "Cost",
        cell: ({ getValue }) => formatCurrency(Number(getValue() ?? 0)),
      },
      {
        id: "retailPrice",
        header: "Retail (×2.3)",
        cell: ({ row }) =>
          formatCurrency(calcRetailPrice(Number(row.original.costPrice ?? 0))),
      },
      {
        id: "compareAtPrice",
        header: "Compare-at",
        cell: ({ row }) => {
          const retail = calcRetailPrice(Number(row.original.costPrice ?? 0));
          return formatCurrency(calcCompareAtPrice(retail));
        },
      },
      {
        accessorKey: "inventory",
        header: "Inventory",
      },
      {
        id: "store",
        header: "Store",
        cell: ({ row }) => row.original.store.name,
        filterFn: (row, _, filterValue) =>
          !filterValue || row.original.store.id === filterValue,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue() as string;
          const colors: Record<string, string> = {
            ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            DRAFT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            ARCHIVED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
          };
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? ""}`}>
              {status}
            </span>
          );
        },
      },
    ],
    []
  );

  const filteredData = useMemo(() => {
    return products.filter((p) => {
      const matchStore = !storeFilter || p.store.id === storeFilter;
      const matchStatus = !statusFilter || p.status === statusFilter;
      return matchStore && matchStatus;
    });
  }, [products, storeFilter, statusFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder="Search SKU or title..."
          className="px-3 py-2 border rounded-md text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground whitespace-nowrap">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-sm whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} products
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-accent transition"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 hover:bg-accent transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
