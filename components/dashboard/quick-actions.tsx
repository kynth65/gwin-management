"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, FileSpreadsheet, Zap } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleShopifySync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/products", { method: "POST" });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Shopify sync started successfully");
    } catch {
      toast.error("Failed to trigger sync");
    } finally {
      setSyncing(false);
    }
  };

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/excel", { method: "POST", body: JSON.stringify({ type: "products" }) });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      toast.success("Excel export ready!", {
        action: { label: "Download", onClick: () => window.open(data.url) },
      });
    } catch {
      toast.error("Failed to generate Excel");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleShopifySync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Shopify"}
      </button>

      <button
        onClick={handleExcelExport}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
      >
        <FileSpreadsheet className="h-4 w-4" />
        {exporting ? "Generating..." : "Generate Excel"}
      </button>

      <Link
        href="/automations"
        className="flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition"
      >
        <Zap className="h-4 w-4" />
        View Automations
      </Link>
    </div>
  );
}
