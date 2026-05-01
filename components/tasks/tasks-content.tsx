"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { CreateTaskDialog } from "./create-task-dialog";
import {
  Trash2,
  ClipboardList,
  AlertTriangle,
  Clock,
  Eye,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import type { AssignableUser, TaskWithUsers, TaskStatus, TaskPriority } from "@/types";

interface TasksContentProps {
  inbox: TaskWithUsers[];
  sent: TaskWithUsers[];
  users: AssignableUser[];
  currentUserId: string;
  isAdmin: boolean;
}

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

type FilterStatus = TaskStatus | "ALL";

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

function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex text-xs font-medium px-2 py-0.5 rounded-full min-w-[88px] justify-center",
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full",
        cfg.className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function RoleBadge({ role }: { role: { name: string; isAdmin: boolean } }) {
  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded font-medium",
        role.isAdmin
          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      )}
    >
      {role.name}
    </span>
  );
}

function EmptyState({ tab, filtered }: { tab: "inbox" | "sent"; filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <ClipboardList className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">
        {filtered ? "No tasks match this filter" : tab === "inbox" ? "Your inbox is clear" : "No tasks sent yet"}
      </p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        {filtered
          ? "Try selecting a different status filter"
          : tab === "inbox"
          ? "Tasks assigned to you will appear here"
          : "Use the Create Task button to assign a task to a team member"}
      </p>
    </div>
  );
}

const FILTER_OPTIONS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Assigned", value: "ASSIGNED" },
  { label: "Seen", value: "SEEN" },
  { label: "Started", value: "STARTED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Postponed", value: "POSTPONED" },
];

export function TasksContent({
  inbox,
  sent,
  users,
  currentUserId,
  isAdmin,
}: TasksContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  const currentTasks = activeTab === "inbox" ? inbox : sent;
  const filteredTasks =
    statusFilter === "ALL" ? currentTasks : currentTasks.filter((t) => t.status === statusFilter);

  const assignedCount = inbox.filter((t) => t.status === "ASSIGNED").length;
  const pendingApprovalCount = sent.filter(
    (t) => t.postponeRequests && t.postponeRequests.length > 0
  ).length;

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete task");
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track team assignments</p>
        </div>
        <CreateTaskDialog users={users} onSuccess={() => router.refresh()} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 p-1 rounded-lg w-fit border">
        {(["inbox", "sent"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setStatusFilter("ALL");
            }}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
              activeTab === tab
                ? tab === "inbox"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-emerald-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {tab === "inbox" ? "Inbox" : "Sent"}
            {tab === "inbox" && assignedCount > 0 && (
              <span
                className={cn(
                  "ml-2 text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none",
                  activeTab === "inbox"
                    ? "bg-white/25 text-white"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {assignedCount}
              </span>
            )}
            {tab === "sent" && pendingApprovalCount > 0 && (
              <span
                className={cn(
                  "ml-2 text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none",
                  activeTab === "sent"
                    ? "bg-white/25 text-white"
                    : "bg-amber-500 text-white"
                )}
              >
                {pendingApprovalCount}
              </span>
            )}
            {tab === "sent" && pendingApprovalCount === 0 && (
              <span
                className={cn(
                  "ml-1.5 text-xs",
                  activeTab === "sent" ? "text-white/70" : "text-muted-foreground"
                )}
              >
                ({sent.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(({ label, value }) => {
          const count =
            value === "ALL"
              ? currentTasks.length
              : currentTasks.filter((t) => t.status === value).length;
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                statusFilter === value
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                  statusFilter === value ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task table */}
      {filteredTasks.length === 0 ? (
        <div className="bg-card border rounded-xl">
          <EmptyState tab={activeTab} filtered={statusFilter !== "ALL"} />
        </div>
      ) : (
        /* overflow-clip trims border-radius corners without creating a scroll container,
           so position:sticky on thead works correctly inside the inner overflow-auto div */
        <div className="bg-card border rounded-xl overflow-clip">
          <div className="overflow-auto max-h-[560px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b bg-muted">
                  {["Task", activeTab === "inbox" ? "From" : "To", "Priority", "Due Date", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const dueStatus = getDueStatus(task.dueDate, task.status);
                  const canDelete = task.senderId === currentUserId || isAdmin;
                  const person = activeTab === "inbox" ? task.sender : task.assignee;
                  const hasPendingPostpone =
                    activeTab === "sent" &&
                    task.postponeRequests &&
                    task.postponeRequests.length > 0;

                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Title + truncated description */}
                      <td className="px-4 py-3 max-w-[240px] border-r border-border">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </td>

                      {/* Person */}
                      <td className="px-4 py-3 whitespace-nowrap border-r border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{person.name}</span>
                          <RoleBadge role={person.role} />
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3 border-r border-border">
                        <PriorityBadge priority={task.priority as TaskPriority} />
                      </td>

                      {/* Due date + urgency indicators */}
                      <td className="px-4 py-3 whitespace-nowrap border-r border-border">
                        {task.dueDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={cn(
                                "flex items-center gap-1 text-sm",
                                dueStatus === "overdue"
                                  ? "text-red-500 font-medium"
                                  : dueStatus === "almost-due"
                                  ? "text-orange-500 font-medium"
                                  : "text-muted-foreground"
                              )}
                            >
                              {dueStatus === "overdue" && (
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                              )}
                              {formatDate(task.dueDate)}
                            </span>
                            {dueStatus === "almost-due" && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-orange-500">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Almost Due
                              </span>
                            )}
                            {dueStatus === "one-week" && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-yellow-600 dark:text-yellow-400">
                                <Clock className="w-2.5 h-2.5" />
                                Due This Week
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status — fixed-width badge keeps the column symmetric */}
                      <td className="px-4 py-3 border-r border-border">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={task.status as TaskStatus} />
                          {hasPendingPostpone && (
                            <span
                              title="Postpone approval needed"
                              className="shrink-0 text-amber-500 dark:text-amber-400"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/tasks/${task.id}`}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1 rounded hover:bg-muted"
                            aria-label="View task"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {canDelete && (
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded hover:bg-destructive/10"
                              aria-label="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
