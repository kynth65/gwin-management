"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { Megaphone, ClipboardList, Pin, Trash2, Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CreateAnnouncementDialog } from "./create-announcement-dialog";
import type { AnnouncementWithAuthor, TaskWithUsers } from "@/types";

type FeedItem =
  | { kind: "announcement"; createdAt: Date; data: AnnouncementWithAuthor }
  | { kind: "task"; createdAt: Date; data: TaskWithUsers };

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export function WhatsNewFeed() {
  const { data: session } = useSession();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = session?.user?.isAdmin === true;

  const fetchFeed = useCallback(async () => {
    try {
      const [annRes, taskRes] = await Promise.all([
        fetch("/api/announcements"),
        fetch("/api/tasks?type=inbox"),
      ]);
      const announcements: AnnouncementWithAuthor[] = annRes.ok ? await annRes.json() : [];
      const allTasks: TaskWithUsers[] = taskRes.ok ? await taskRes.json() : [];

      const newTasks = allTasks.filter(
        (t) => t.status === "ASSIGNED" || t.status === "SEEN"
      );

      const merged: FeedItem[] = [
        ...announcements.map((a) => ({
          kind: "announcement" as const,
          createdAt: new Date(a.createdAt),
          data: a,
        })),
        ...newTasks.map((t) => ({
          kind: "task" as const,
          createdAt: new Date(t.createdAt),
          data: t,
        })),
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setItems(merged);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchFeed();
  }, [session, fetchFeed]);

  async function deleteAnnouncement(id: string) {
    const prev = items;
    setItems((cur) => cur.filter((i) => !(i.kind === "announcement" && i.data.id === id)));
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Announcement deleted");
    } catch {
      setItems(prev);
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          What&apos;s New
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
              <TaskCard key={item.data.id} item={item.data} />
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

function TaskCard({ item }: { item: TaskWithUsers }) {
  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
          <ClipboardList className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              New Task Assigned
            </p>
            <span className="text-[10px] text-muted-foreground shrink-0 whitespace-nowrap">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{item.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide",
                PRIORITY_STYLES[item.priority]
              )}
            >
              {item.priority}
            </span>
            <span className="text-[11px] text-muted-foreground">From: {item.sender.name}</span>
            {item.dueDate && (
              <span className="text-[11px] text-muted-foreground">
                Due: {new Date(item.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <Link
            href={`/tasks/${item.id}`}
            className="text-xs text-primary hover:underline mt-1.5 inline-block"
          >
            View task →
          </Link>
        </div>
      </div>
    </div>
  );
}
