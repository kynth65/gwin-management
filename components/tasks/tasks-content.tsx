"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";
import { CreateTaskDialog } from "./create-task-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ChevronDown,
  Trash2,
  ClipboardList,
  AlertTriangle,
  Clock,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import type { AssignableUser, TaskWithUsers, TaskStatus, TaskPriority } from "@/types";

interface TasksContentProps {
  inbox: TaskWithUsers[];
  sent: TaskWithUsers[];
  users: AssignableUser[];
  currentUserId: string;
  currentUserRole: string;
}

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
    <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", cfg.className)}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full", cfg.className)}
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

function StatusSelector({
  taskId,
  status,
  updating,
  onUpdate,
}: {
  taskId: string;
  status: TaskStatus;
  updating: string | null;
  onUpdate: (id: string, status: string) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  const isUpdating = updating === taskId;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          disabled={isUpdating}
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-opacity cursor-pointer",
            cfg.className,
            isUpdating && "opacity-50 cursor-wait"
          )}
        >
          {isUpdating ? "Saving..." : cfg.label}
          {!isUpdating && <ChevronDown className="w-3 h-3 opacity-70" />}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-card border border-border rounded-lg shadow-xl p-1 z-50 min-w-[150px] animate-in fade-in-0 zoom-in-95"
          align="start"
          sideOffset={5}
        >
          {(Object.entries(STATUS_CONFIG) as [TaskStatus, (typeof STATUS_CONFIG)[TaskStatus]][]).map(
            ([val, { label, className }]) => (
              <DropdownMenu.Item
                key={val}
                onSelect={() => val !== status && onUpdate(taskId, val)}
                className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted outline-none"
              >
                <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", className)}>
                  {label}
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
  { label: "Pending", value: "PENDING" },
  { label: "Ongoing", value: "ONGOING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Postponed", value: "POSTPONED" },
];

export function TasksContent({
  inbox,
  sent,
  users,
  currentUserId,
  currentUserRole,
}: TasksContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inbox" | "sent">("inbox");
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  const currentTasks = activeTab === "inbox" ? inbox : sent;
  const filteredTasks =
    statusFilter === "ALL" ? currentTasks : currentTasks.filter((t) => t.status === statusFilter);
  const pendingCount = inbox.filter((t) => t.status === "PENDING").length;

  async function updateStatus(taskId: string, status: string) {
    setUpdating(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update");
      }
      toast.success("Status updated");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setUpdating(null);
    }
  }

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
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "inbox" ? "Inbox" : "Sent"}
            {tab === "inbox" && pendingCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-semibold leading-none">
                {pendingCount}
              </span>
            )}
            {tab === "sent" && (
              <span className="ml-1.5 text-muted-foreground text-xs">({sent.length})</span>
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
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {["Task", activeTab === "inbox" ? "From" : "To", "Priority", "Due Date", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
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
                  const canDelete =
                    task.senderId === currentUserId || currentUserRole === "ADMIN";
                  const person = activeTab === "inbox" ? task.sender : task.assignee;

                  return (
                    <tr key={task.id} className="hover:bg-muted/20 transition-colors group">
                      {/* Title + truncated description */}
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </td>

                      {/* Person */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{person.name}</span>
                          <RoleBadge role={person.role} />
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-4 py-3">
                        <PriorityBadge priority={task.priority as TaskPriority} />
                      </td>

                      {/* Due date + urgency indicators */}
                      <td className="px-4 py-3 whitespace-nowrap">
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

                      {/* Status */}
                      <td className="px-4 py-3">
                        {activeTab === "inbox" ? (
                          <StatusSelector
                            taskId={task.id}
                            status={task.status as TaskStatus}
                            updating={updating}
                            onUpdate={updateStatus}
                          />
                        ) : (
                          <StatusBadge status={task.status as TaskStatus} />
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <Link
                            href={`/tasks/${task.id}`}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1 rounded hover:bg-muted"
                            aria-label="View task"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          {/* Delete */}
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
