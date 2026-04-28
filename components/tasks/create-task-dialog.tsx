"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Plus } from "lucide-react";
import type { AssignableUser } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Max 100 characters"),
  description: z.string().max(500, "Max 500 characters").optional(),
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          description: data.description || null,
          dueDate: data.dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create task");
      toast.success("Task created successfully");
      reset();
      setOpen(false);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
            "bg-card border rounded-xl p-6 w-full max-w-md shadow-2xl",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4"
          )}
        >
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold">Create Task</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
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

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                {...register("description")}
                placeholder="Optional details..."
                rows={2}
                className={cn(inputClass, "resize-none")}
              />
              {errors.description && (
                <p className="text-destructive text-xs mt-1">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select {...register("priority")} className={inputClass}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  {...register("dueDate")}
                  type="date"
                  min={today}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
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
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
