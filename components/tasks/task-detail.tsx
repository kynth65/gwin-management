"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  CalendarDays,
  User,
  ChevronDown,
  ZoomIn,
  X,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { TaskWithUsers, TaskStatus, TaskPriority } from "@/types";

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  ONGOING: {
    label: "Ongoing",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  POSTPONED: {
    label: "Postponed",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string; dot: string }> = {
  HIGH: {
    label: "High",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    dot: "bg-red-500",
  },
  MEDIUM: {
    label: "Medium",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-400",
  },
  LOW: {
    label: "Low",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

function getDueStatus(dueDate: Date | string | null, status: string) {
  if (!dueDate || status === "COMPLETED") return null;
  const now = new Date();
  const due = new Date(dueDate);
  const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "overdue";
  if (days <= 3) return "almost-due";
  if (days <= 7) return "one-week";
  return null;
}

interface TaskDetailProps {
  task: TaskWithUsers & { images: string[] };
  currentUserId: string;
  isAdmin: boolean;
}

export function TaskDetail({ task, currentUserId, isAdmin }: TaskDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [updating, setUpdating] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const isAssignee = task.assigneeId === currentUserId;
  const canUpdateStatus = isAssignee || isAdmin;
  const dueStatus = getDueStatus(task.dueDate, status);
  const statusCfg = STATUS_CONFIG[status];
  const priorityCfg = PRIORITY_CONFIG[task.priority as TaskPriority];

  async function handleStatusChange(newStatus: TaskStatus) {
    if (newStatus === status || updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      setStatus(newStatus);
      toast.success("Status updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tasks
      </Link>

      {/* Header card */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status — clickable if allowed */}
          {canUpdateStatus ? (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  disabled={updating}
                  className={cn(
                    "inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-opacity",
                    statusCfg.className,
                    updating && "opacity-50 cursor-wait"
                  )}
                >
                  {updating ? "Saving..." : statusCfg.label}
                  {!updating && <ChevronDown className="w-3 h-3 opacity-70" />}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="bg-card border border-border rounded-lg shadow-xl p-1 z-50 min-w-[160px] animate-in fade-in-0 zoom-in-95"
                  align="start"
                  sideOffset={5}
                >
                  {(Object.entries(STATUS_CONFIG) as [TaskStatus, (typeof STATUS_CONFIG)[TaskStatus]][]).map(
                    ([val, cfg]) => (
                      <DropdownMenu.Item
                        key={val}
                        onSelect={() => handleStatusChange(val)}
                        className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted outline-none"
                      >
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.className)}>
                          {cfg.label}
                        </span>
                        {val === status && (
                          <span className="text-xs text-muted-foreground">current</span>
                        )}
                      </DropdownMenu.Item>
                    )
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          ) : (
            <span className={cn("inline-flex text-xs font-medium px-2.5 py-1 rounded-full", statusCfg.className)}>
              {statusCfg.label}
            </span>
          )}

          {/* Priority */}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
              priorityCfg.className
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityCfg.dot)} />
            {priorityCfg.label} Priority
          </span>

          {/* Due date badge */}
          {dueStatus === "almost-due" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <AlertTriangle className="w-3 h-3" />
              Almost Due
            </span>
          )}
          {dueStatus === "one-week" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <Clock className="w-3 h-3" />
              Due This Week
            </span>
          )}
          {dueStatus === "overdue" && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <AlertTriangle className="w-3 h-3" />
              Overdue
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>

        {/* Meta grid */}
        <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-start gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Sent by</p>
              <p className="font-medium">{task.sender.name}</p>
              <p className="text-xs text-muted-foreground">{task.sender.role.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Assigned to</p>
              <p className="font-medium">{task.assignee.name}</p>
              <p className="text-xs text-muted-foreground">{task.assignee.role.name}</p>
            </div>
          </div>
          {task.dueDate && (
            <div className="flex items-start gap-2 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Due date</p>
                <p
                  className={cn(
                    "font-medium",
                    dueStatus === "overdue" && "text-red-500",
                    dueStatus === "almost-due" && "text-orange-500"
                  )}
                >
                  {formatDate(task.dueDate)}
                </p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Created</p>
              <p className="font-medium">{formatDate(task.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Description
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* Images */}
      {task.images && task.images.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Attachments ({task.images.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {task.images.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(url)}
                className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:border-primary/50 transition-colors"
              >
                <Image
                  src={url}
                  alt={`Attachment ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={lightbox}
              alt="Attachment preview"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
