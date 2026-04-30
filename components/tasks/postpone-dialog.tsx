"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import { X, CalendarClock, ImagePlus, Loader2, XCircle } from "lucide-react";
import Image from "next/image";

interface PostponeDialogProps {
  taskId: string;
  taskTitle: string;
  currentDueDate?: Date | string | null;
  onSuccess: () => void;
  trigger: React.ReactNode;
}

const inputClass =
  "w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

export function PostponeDialog({
  taskId,
  taskTitle,
  currentDueDate,
  onSuccess,
  trigger,
}: PostponeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [extensionDays, setExtensionDays] = useState<number | "">(7);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate the new projected due date based on extension
  function getNewDueDate(): string | null {
    if (!currentDueDate || !extensionDays || typeof extensionDays !== "number") return null;
    const base = new Date(currentDueDate);
    base.setDate(base.getDate() + extensionDays);
    return base.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function handleClose() {
    setOpen(false);
    setDescription("");
    setExtensionDays(7);
    setImageUrls([]);
    setUploadingCount(0);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    e.target.value = "";

    await Promise.all(
      fileArray.map(async (file) => {
        setUploadingCount((c) => c + 1);
        try {
          const blob = await upload(`task-images/${Date.now()}-${file.name}`, file, {
            access: "public",
            handleUploadUrl: "/api/tasks/upload",
          });
          setImageUrls((prev) => [...prev, blob.url]);
        } catch {
          toast.error(`Failed to upload ${file.name}`);
        } finally {
          setUploadingCount((c) => c - 1);
        }
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      toast.error("Please provide a description for the postpone request");
      return;
    }
    if (!extensionDays || typeof extensionDays !== "number" || extensionDays < 1) {
      toast.error("Please enter a valid number of extension days");
      return;
    }
    if (uploadingCount > 0) {
      toast.error("Please wait for images to finish uploading");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/postpone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, extensionDays, imageUrls }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      toast.success("Postpone request submitted — awaiting assigner approval");
      handleClose();
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit request");
    } finally {
      setLoading(false);
    }
  }

  const newDueDate = getNewDueDate();

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-card border rounded-xl shadow-2xl w-[calc(100vw-2rem)] max-w-lg",
            "max-h-[90dvh] flex flex-col",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <Dialog.Title className="text-base font-semibold">Request Postpone</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto flex-1">
            <div className="px-6 py-5 space-y-5">
              {/* Task context */}
              <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm">
                <p className="text-muted-foreground text-xs mb-0.5">Task</p>
                <p className="font-medium truncate">{taskTitle}</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Why are you requesting a postpone? <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the reason for requesting more time..."
                  rows={4}
                  className={cn(inputClass, "resize-y min-h-[100px]")}
                />
              </div>

              {/* Extension days */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Extension requested (days) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={extensionDays}
                  onChange={(e) =>
                    setExtensionDays(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                  }
                  className={inputClass}
                  placeholder="e.g. 7"
                />
                {/* New due date preview */}
                {newDueDate && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3 text-amber-500" />
                    New projected due date:{" "}
                    <span className="font-medium text-foreground">{newDueDate}</span>
                  </p>
                )}
                {!currentDueDate && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    This task has no due date — the assigner will set one if approved.
                  </p>
                )}
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Supporting images{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingCount > 0}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg text-sm transition-colors",
                    "text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-muted/30",
                    uploadingCount > 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {uploadingCount > 0 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading {uploadingCount} file{uploadingCount > 1 ? "s" : ""}...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-4 h-4" />
                      Add supporting images
                    </>
                  )}
                </button>

                {imageUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {imageUrls.map((url, i) => (
                      <div
                        key={i}
                        className="relative group aspect-square rounded-md overflow-hidden border bg-muted"
                      >
                        <Image
                          src={url}
                          alt={`Attachment ${i + 1}`}
                          fill
                          className="object-cover"
                          sizes="120px"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t shrink-0 flex gap-3 bg-card">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || uploadingCount > 0}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
