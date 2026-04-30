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
  ZoomIn,
  X,
  CheckCircle2,
  Circle,
  Play,
  Flag,
  CalendarClock,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from "lucide-react";
import { PostponeDialog } from "./postpone-dialog";
import type { TaskWithUsers, TaskStatus, TaskPriority, PostponeRequestWithUsers } from "@/types";

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  ASSIGNED: {
    label: "Assigned",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  SEEN: {
    label: "Seen",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  },
  STARTED: {
    label: "Started",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  POSTPONED: {
    label: "Postponed",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
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

const STATUS_ORDER: TaskStatus[] = ["ASSIGNED", "SEEN", "STARTED", "COMPLETED"];

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

function TaskProgressBar({ status }: { status: TaskStatus }) {
  const isPostponed = status === "POSTPONED";
  // POSTPONED maps to position 3 (the final slot, same as COMPLETED)
  const currentIdx = isPostponed ? 3 : STATUS_ORDER.indexOf(status);

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {STATUS_ORDER.map((step, idx) => {
          const isCompleted = idx < currentIdx || (idx === currentIdx && status === "COMPLETED");
          const isCurrent = idx === currentIdx && !isCompleted;
          const isLast = idx === STATUS_ORDER.length - 1;
          const isPostponedSlot = isCurrent && isPostponed && step === "COMPLETED";

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all",
                    isPostponedSlot
                      ? "bg-orange-500 border-orange-500 text-white"
                      : isCompleted && step === "COMPLETED"
                      ? "bg-green-500 border-green-500 text-white"
                      : isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground"
                  )}
                >
                  {isPostponedSlot ? (
                    <CalendarClock className="w-3.5 h-3.5" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    step === "ASSIGNED" ? <Flag className="w-3.5 h-3.5" /> :
                    step === "SEEN" ? <Circle className="w-3.5 h-3.5" /> :
                    step === "STARTED" ? <Play className="w-3.5 h-3.5" /> :
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-xs font-semibold">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-1 font-medium whitespace-nowrap",
                    isPostponedSlot
                      ? "text-orange-600 dark:text-orange-400"
                      : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step === "COMPLETED" && isPostponed ? "Postponed" : STATUS_CONFIG[step].label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 mt-[-14px]",
                    idx < currentIdx ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TaskDetailProps {
  task: TaskWithUsers & { images: string[]; postponeRequests: PostponeRequestWithUsers[] };
  currentUserId: string;
  isAdmin: boolean;
}

export function TaskDetail({ task, currentUserId, isAdmin }: TaskDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  const isAssignee = task.assigneeId === currentUserId;
  const isSender = task.senderId === currentUserId;
  const dueStatus = getDueStatus(task.dueDate, status);
  const statusCfg = STATUS_CONFIG[status];
  const priorityCfg = PRIORITY_CONFIG[task.priority as TaskPriority];

  const pendingPostpone = task.postponeRequests?.find((r) => r.status === "PENDING");
  const canReviewPostpone = (isSender || isAdmin) && !!pendingPostpone;

  async function handleStart() {
    setActionLoading("start");
    try {
      const res = await fetch(`/api/tasks/${task.id}/start`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start task");
      }
      setStatus("STARTED");
      toast.success("Task started — your assigner has been notified");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start task");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleComplete() {
    setActionLoading("complete");
    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to complete task");
      }
      setStatus("COMPLETED");
      toast.success("Task marked as completed!");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete task");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePostponeReview(requestId: string, action: "APPROVE" | "REJECT") {
    setActionLoading(`review-${action}`);
    try {
      const res = await fetch(`/api/tasks/${task.id}/postpone/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, assignerNote: rejectNote }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to review request");
      }
      if (action === "APPROVE") {
        setStatus("POSTPONED");
        toast.success("Postpone request approved");
      } else {
        toast.success("Postpone request rejected");
        setShowRejectInput(null);
        setRejectNote("");
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to review request");
    } finally {
      setActionLoading(null);
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
      <div className="bg-card border rounded-xl p-6 space-y-5">
        {/* Progress bar */}
        <TaskProgressBar status={status} />

        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
          <span className={cn("inline-flex text-xs font-medium px-2.5 py-1 rounded-full", statusCfg.className)}>
            {statusCfg.label}
          </span>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
              priorityCfg.className
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priorityCfg.dot)} />
            {priorityCfg.label} Priority
          </span>

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
          {pendingPostpone && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse">
              <Clock className="w-3 h-3" />
              Postpone Pending Approval
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
              <p className="text-xs text-muted-foreground mb-0.5">Assigned by</p>
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

      {/* Action buttons (for assignee only) */}
      {isAssignee && !pendingPostpone && (status === "ASSIGNED" || status === "SEEN") && (
        <div className="bg-card border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-3">Ready to work on this task?</p>
          <button
            onClick={handleStart}
            disabled={actionLoading === "start"}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {actionLoading === "start" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {actionLoading === "start" ? "Starting..." : "Start Task"}
          </button>
        </div>
      )}

      {isAssignee && !pendingPostpone && status === "STARTED" && (
        <div className="bg-card border rounded-xl p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Update task progress</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleComplete}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "complete" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {actionLoading === "complete" ? "Saving..." : "Mark Complete"}
            </button>

            <PostponeDialog
              taskId={task.id}
              taskTitle={task.title}
              currentDueDate={task.dueDate}
              onSuccess={() => router.refresh()}
              trigger={
                <button
                  disabled={!!actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  <CalendarClock className="w-4 h-4" />
                  Request Postpone
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Pending postpone request — shown to assigner/admin for review */}
      {canReviewPostpone && pendingPostpone && (
        <div className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-amber-500 shrink-0" />
            <h2 className="text-base font-semibold">Postpone Request — Awaiting Your Approval</h2>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Requested by</p>
              <p className="font-medium">{pendingPostpone.requester.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Extension requested</p>
              <p className="font-medium">{pendingPostpone.extensionDays} day{pendingPostpone.extensionDays !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                {pendingPostpone.description}
              </p>
            </div>
          </div>

          {/* Postpone request images */}
          {pendingPostpone.images && pendingPostpone.images.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Supporting images</p>
              <div className="grid grid-cols-3 gap-2">
                {pendingPostpone.images.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setLightbox(url)}
                    className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:border-primary/50 transition-colors"
                  >
                    <Image
                      src={url}
                      alt={`Supporting image ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
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

          {/* Reject note input */}
          {showRejectInput === pendingPostpone.id && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                Rejection note (optional)
              </label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Let the assignee know why the postpone was rejected..."
                rows={3}
                className="w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              />
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => handlePostponeReview(pendingPostpone.id, "APPROVE")}
              disabled={!!actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading === "review-APPROVE" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
              Approve
            </button>

            {showRejectInput === pendingPostpone.id ? (
              <button
                onClick={() => handlePostponeReview(pendingPostpone.id, "REJECT")}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading === "review-REJECT" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                Confirm Reject
              </button>
            ) : (
              <button
                onClick={() => setShowRejectInput(pendingPostpone.id)}
                disabled={!!actionLoading}
                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                <ThumbsDown className="w-4 h-4" />
                Reject
              </button>
            )}

            {showRejectInput === pendingPostpone.id && (
              <button
                onClick={() => { setShowRejectInput(null); setRejectNote(""); }}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

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
              alt="Preview"
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
