"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ClipboardList } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED: "New task",
  TASK_SEEN: "Task seen",
  TASK_STARTED: "Task started",
  TASK_COMPLETED: "Task completed",
  POSTPONE_REQUESTED: "Postpone requested",
  POSTPONE_APPROVED: "Postpone approved",
  POSTPONE_REJECTED: "Postpone rejected",
};

const TYPE_COLORS: Record<string, string> = {
  TASK_ASSIGNED: "bg-blue-500",
  TASK_SEEN: "bg-slate-400",
  TASK_STARTED: "bg-amber-500",
  TASK_COMPLETED: "bg-green-500",
  POSTPONE_REQUESTED: "bg-orange-500",
  POSTPONE_APPROVED: "bg-green-500",
  POSTPONE_REJECTED: "bg-red-500",
};

function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {
      // silent fail — bell is non-critical
    }
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        className="relative p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border rounded-xl shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <ClipboardList className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!n.read) markOneRead(n.id);
                    if (n.taskId) setOpen(false);
                  }}
                >
                  {/* Color dot */}
                  <div className="mt-1 shrink-0">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full block",
                        TYPE_COLORS[n.type] ?? "bg-primary"
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {TYPE_LABELS[n.type] ?? n.type}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5 leading-snug">{n.message}</p>
                    {n.taskId && (
                      <Link
                        href={`/tasks/${n.taskId}`}
                        className="text-xs text-primary hover:underline mt-1 block"
                      >
                        View task →
                      </Link>
                    )}
                  </div>

                  {!n.read && (
                    <div className="mt-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
