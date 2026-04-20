"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, FileSpreadsheet } from "lucide-react";

type TriggerKey = "shopify" | "products-excel" | "orders-excel";

export function ManualTriggers() {
  const [loading, setLoading] = useState<TriggerKey | null>(null);

  const trigger = async (key: TriggerKey, label: string, body: object) => {
    setLoading(key);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(`${label} triggered successfully`);
    } catch {
      toast.error(`Failed to trigger ${label}`);
    } finally {
      setLoading(null);
    }
  };

  const triggerExcel = async (key: TriggerKey, type: string) => {
    setLoading(key);
    try {
      const res = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Excel generated!", {
        action: { label: "Download", onClick: () => window.open(data.url) },
      });
    } catch {
      toast.error("Failed to generate Excel");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Manual Triggers</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => trigger("shopify", "Shopify Sync", { action: "sync" })}
          disabled={loading === "shopify"}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading === "shopify" ? "animate-spin" : ""}`} />
          {loading === "shopify" ? "Syncing..." : "Sync Shopify Now"}
        </button>

        <button
          onClick={() => triggerExcel("products-excel", "products")}
          disabled={loading === "products-excel"}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {loading === "products-excel" ? "Generating..." : "Generate Products Excel"}
        </button>

        <button
          onClick={() => triggerExcel("orders-excel", "orders")}
          disabled={loading === "orders-excel"}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {loading === "orders-excel" ? "Generating..." : "Generate Orders Excel"}
        </button>
      </div>
    </div>
  );
}
