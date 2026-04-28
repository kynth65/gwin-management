"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { FileSpreadsheet, X, ChevronRight } from "lucide-react";

type SheetType = "gwin" | "mrcooldirect";

const SHEETS: { type: SheetType; label: string; sub: string; soon?: boolean }[] = [
  { type: "gwin", label: "Gwin & HVAC Products", sub: "Main HVAC sales spreadsheet" },
  { type: "mrcooldirect", label: "MrCoolDirect", sub: "Coming soon — not yet configured", soon: true },
];

export function AddToExcelButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<SheetType | null>(null);

  const handleAdd = async (sheetType: SheetType) => {
    setLoading(sheetType);
    try {
      const res = await fetch(`/api/orders/${orderId}/add-to-excel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetType }),
      });
      const data = (await res.json()) as { rowsAdded?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const sheetLabel = SHEETS.find((s) => s.type === sheetType)?.label ?? sheetType;
      toast.success(`Added ${data.rowsAdded} row(s) to "${sheetLabel}"`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to sheet");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 active:scale-95 transition-all">
          <FileSpreadsheet className="h-4 w-4" />
          Add to Excel
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-card border rounded-xl shadow-xl p-6 space-y-4 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">Add to Excel Sheet</Dialog.Title>
            <Dialog.Close className="rounded-md p-1 hover:bg-muted transition-colors">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-muted-foreground">
            Choose which spreadsheet to add this order&apos;s line items to. One row will be created per product.
          </Dialog.Description>

          <div className="space-y-2 pt-1">
            {SHEETS.map(({ type, label, sub, soon }) => (
              <button
                key={type}
                onClick={() => !soon && handleAdd(type)}
                disabled={loading !== null || soon}
                className={`w-full flex items-center justify-between px-4 py-3.5 border-2 rounded-lg transition-all text-left group
                  ${soon
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
                  }`}
              >
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {loading === type ? "Adding rows..." : sub}
                  </p>
                </div>
                {!soon && loading !== type && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors shrink-0" />
                )}
                {loading === type && (
                  <div className="h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
