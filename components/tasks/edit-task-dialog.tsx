"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { X, Loader2 } from "lucide-react";
import type { TaskWithUsers, TaskPriority } from "@/types";

const schema = z.object({
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface EditTaskDialogProps {
  task: TaskWithUsers;
  trigger: React.ReactNode;
  onSuccess: () => void;
}

const inputClass =
  "w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

export function EditTaskDialog({ task, trigger, onSuccess }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentDueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: (task.priority as TaskPriority) ?? "MEDIUM",
      dueDate: currentDueDate,
    },
  });

  function handleClose() {
    setOpen(false);
    reset();
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priority: data.priority,
          dueDate: data.dueDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update task");
      toast.success("Task updated");
      handleClose();
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "bg-card border rounded-xl shadow-2xl w-[calc(100vw-2rem)] max-w-md",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-4"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <Dialog.Title className="text-base font-semibold">Edit Task</Dialog.Title>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[280px]">
                {task.title}
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Priority</label>
              <select {...register("priority")} className={inputClass}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              {errors.priority && (
                <p className="text-destructive text-xs mt-1">{errors.priority.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Due Date</label>
              <input
                {...register("dueDate")}
                type="date"
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Clear the date to remove the due date.
              </p>
            </div>

            {/* Footer */}
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
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
