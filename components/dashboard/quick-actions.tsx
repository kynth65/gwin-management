"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Zap } from "lucide-react";
import Link from "next/link";

export function QuickActions() {
  const [syncing, setSyncing] = useState(false);

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

  return (
    <div className="flex flex-wrap gap-3">
      <button
        onClick={handleShopifySync}
        disabled={syncing}
        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Syncing..." : "Sync Shopify"}
      </button>

      <Link
        href="/automations"
        className="flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all"
      >
        <Zap className="h-4 w-4" />
        View Automations
      </Link>
    </div>
  );
}
