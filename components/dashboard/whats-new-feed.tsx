"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import {
  Megaphone, Pin, Trash2, Loader2, Inbox,
  ClipboardList, CheckCircle2, Clock, AlertCircle, Eye, XCircle, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import type { AnnouncementWithAuthor, AppNotification } from "@/types";

type FeedItem =
  | { kind: "announcement"; createdAt: Date; data: AnnouncementWithAuthor }
  | { kind: "notification"; createdAt: Date; data: AppNotification };

const NOTIF_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  TASK_ASSIGNED:      { icon: ClipboardList, color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-100 dark:bg-blue-950" },
  TASK_SEEN:          { icon: Eye,           color: "text-slate-500 dark:text-slate-400",   bg: "bg-slate-100 dark:bg-slate-800" },
  TASK_STARTED:       { icon: Play,          color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-100 dark:bg-amber-950" },
  TASK_COMPLETED:     { icon: CheckCircle2,  color: "text-green-600 dark:text-green-400",   bg: "bg-green-100 dark:bg-green-950" },
  POSTPONE_REQUESTED: { icon: Clock,         color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-950" },
  POSTPONE_APPROVED:  { icon: CheckCircle2,  color: "text-green-600 dark:text-green-400",   bg: "bg-green-100 dark:bg-green-950" },
  POSTPONE_REJECTED:  { icon: XCircle,       color: "text-red-600 dark:text-red-400",       bg: "bg-red-100 dark:bg-red-950" },
  TASK_OVERDUE:       { icon: AlertCircle,   color: "text-red-600 dark:text-red-400",       bg: "bg-red-100 dark:bg-red-950" },
};

const TYPE_LABELS: Record<string, string> = {
  TASK_ASSIGNED:      "New task assigned",
  TASK_SEEN:          "Task seen",
  TASK_STARTED:       "Task started",
  TASK_COMPLETED:     "Task completed",
  POSTPONE_REQUESTED: "Postpone requested",
  POSTPONE_APPROVED:  "Postpone approved",
  POSTPONE_REJECTED:  "Postpone rejected",
  TASK_OVERDUE:       "Task overdue",
};

interface WhatsNewFeedProps {
  initialAnnouncements?: AnnouncementWithAuthor[];
}

export function WhatsNewFeed({ initialAnnouncements = [] }: WhatsNewFeedProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;

  const buildItems = useCallback(
    (anns: AnnouncementWithAuthor[], notifs: AppNotification[]): FeedItem[] =>
      [
        ...anns.map((a) => ({ kind: "announcement" as const, createdAt: new Date(a.createdAt), data: a })),
        ...notifs.map((n) => ({ kind: "notification" as const, createdAt: new Date(n.createdAt), data: n })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    []
  );

  const [items, setItems] = useState<FeedItem[]>(() => buildItems(initialAnnouncements, []));
  const [announcements, setAnnouncements] = useState<AnnouncementWithAuthor[]>(initialAnnouncements);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(initialAnnouncements.length === 0);

  const fetchFeed = useCallback(async () => {
    try {
      const [annRes, notifRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/notifications"),
      ]);
      const freshAnns: AnnouncementWithAuthor[] = annRes.ok ? await annRes.json() : [];
      const freshNotifs: AppNotification[] = notifRes.ok ? await notifRes.json() : [];
      setAnnouncements(freshAnns);
      setNotifications(freshNotifs);
      setItems(buildItems(freshAnns, freshNotifs));
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [buildItems]);

  useEffect(() => {
    if (session) fetchFeed();
  }, [session, fetchFeed]);

  async function deleteAnnouncement(id: string) {
    const prevItems = items;
    const prevAnns = announcements;
    setItems((cur) => cur.filter((i) => !(i.kind === "announcement" && i.data.id === id)));
    setAnnouncements((cur) => cur.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
    } catch {
      setItems(prevItems);
      setAnnouncements(prevAnns);
      toast.error("Failed to delete");
    }
  }

  async function markNotifRead(id: string) {
    const patch = (n: AppNotification) => (n.id === id ? { ...n, read: true } : n);
    setNotifications((prev) => prev.map(patch));
    setItems((prev) =>
      prev.map((item) =>
        item.kind === "notification" && item.data.id === id
          ? { ...item, data: { ...item.data, read: true } }
          : item
      )
    );
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          What&apos;s New
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </h2>
        {isAdmin && <CreateAnnouncementDialog onCreated={fetchFeed} />}
      </div>

      {/* Feed */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-border">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Inbox className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Nothing new right now</p>
          </div>
        ) : (
          items.map((item) =>
            item.kind === "announcement" ? (
              <AnnouncementCard
                key={item.data.id}
                item={item.data}
                isAdmin={isAdmin}
                onDelete={deleteAnnouncement}
              />
            ) : (
              <NotificationCard
                key={item.data.id}
                item={item.data}
                onMarkRead={markNotifRead}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({
  item,
  isAdmin,
  onDelete,
}: {
  item: AnnouncementWithAuthor;
  isAdmin: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.pinned && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
              {isAdmin && (
                <button
                  onClick={() => onDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400 text-muted-foreground"
                  aria-label="Delete announcement"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
            {item.content}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Posted by {item.author.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function NotificationCard({
  item,
  onMarkRead,
}: {
  item: AppNotification;
  onMarkRead: (id: string) => void;
}) {
  const style = NOTIF_STYLE[item.type] ?? NOTIF_STYLE.TASK_ASSIGNED;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        "px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer",
        !item.read && "bg-primary/5"
      )}
      onClick={() => { if (!item.read) onMarkRead(item.id); }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center", style.bg)}>
          <Icon className={cn("h-3.5 w-3.5", style.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-[10px] font-semibold uppercase tracking-wide", style.color)}>
              {TYPE_LABELS[item.type] ?? item.type}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
              </span>
              {!item.read && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary block" />
              )}
            </div>
          </div>
          <p className="text-sm text-foreground mt-0.5 leading-snug">{item.message}</p>
          {item.taskId && (
            <Link
              href={`/tasks/${item.taskId}`}
              className="text-xs text-primary hover:underline mt-1.5 inline-block"
            >
              View task →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
