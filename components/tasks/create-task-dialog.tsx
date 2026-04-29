"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { cn } from "@/lib/utils";
import { X, Plus, ImagePlus, Loader2, XCircle } from "lucide-react";
import Image from "next/image";
import type { AssignableUser } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().max(2000, "Max 2000 characters").optional(),
  assigneeId: z.string().min(1, "Please select an assignee"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreateTaskDialogProps {
  users: AssignableUser[];
  onSuccess: () => void;
}

const inputClass =
  "w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

export function CreateTaskDialog({ users, onSuccess }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const descriptionValue = watch("description") ?? "";

  function handleClose() {
    setOpen(false);
    reset();
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

  function removeImage(url: string) {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  }

  const onSubmit = async (data: FormData) => {
    if (uploadingCount > 0) {
      toast.error("Please wait for images to finish uploading");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          description: data.description || null,
          dueDate: data.dueDate || null,
          imageUrls,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create task");
      toast.success("Task created successfully");
      handleClose();
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-sm">
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-card border rounded-xl shadow-2xl w-[calc(100vw-2rem)] max-w-2xl",
            "max-h-[90dvh] flex flex-col",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <Dialog.Title className="text-lg font-semibold">Create Task</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Scrollable form body */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col overflow-y-auto flex-1"
          >
            <div className="px-6 py-5 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  {...register("title")}
                  placeholder="What needs to be done?"
                  className={inputClass}
                  autoFocus
                />
                {errors.title && (
                  <p className="text-destructive text-xs mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium">Description</label>
                  <span className="text-xs text-muted-foreground">
                    {descriptionValue.length} / 2000
                  </span>
                </div>
                <textarea
                  {...register("description")}
                  placeholder="Add details, instructions, or context for this task..."
                  rows={6}
                  className={cn(inputClass, "resize-y min-h-[120px]")}
                />
                {errors.description && (
                  <p className="text-destructive text-xs mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Assign To */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Assign To <span className="text-destructive">*</span>
                </label>
                <select {...register("assigneeId")} className={inputClass}>
                  <option value="">Select a team member...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.role.isAdmin ? "Admin" : "Staff"}
                    </option>
                  ))}
                </select>
                {errors.assigneeId && (
                  <p className="text-destructive text-xs mt-1">{errors.assigneeId.message}</p>
                )}
              </div>

              {/* Priority + Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Priority</label>
                  <select {...register("priority")} className={inputClass}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Due Date</label>
                  <input
                    {...register("dueDate")}
                    type="date"
                    min={today}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Attachments{" "}
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
                      Add images (up to 100 MB each)
                    </>
                  )}
                </button>

                {/* Thumbnails */}
                {imageUrls.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
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
                          onClick={() => removeImage(url)}
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
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
