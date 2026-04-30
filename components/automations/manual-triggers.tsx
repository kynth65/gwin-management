"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet } from "lucide-react";

export function ManualTriggers() {
  const [loading, setLoading] = useState(false);

  const triggerOrdersExcel = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "orders" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success("Excel generated!", {
        action: { label: "Download", onClick: () => window.open(data.url) },
      });
    } catch {
      toast.error("Failed to generate Excel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Manual Triggers</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={triggerOrdersExcel}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          {loading ? "Generating..." : "Generate Orders Excel"}
        </button>
      </div>
    </div>
  );
}
