"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Megaphone, Pin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onCreated: () => void;
}

const inputClass =
  "w-full px-3 py-2 border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary";

export function CreateAnnouncementDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, pinned }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Announcement posted");
      setTitle("");
      setContent("");
      setPinned(false);
      setOpen(false);
      onCreated();
    } catch {
      toast.error("Failed to post announcement");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
          <Megaphone className="h-3.5 w-3.5" />
          Post
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border rounded-xl shadow-2xl p-6 animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">Post Announcement</Dialog.Title>
            <Dialog.Close className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="ann-title">Title</label>
              <input
                id="ann-title"
                className={inputClass}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Announcement title"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="ann-content">Content</label>
              <textarea
                id="ann-content"
                className={cn(inputClass, "min-h-[100px] resize-y")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your announcement..."
                required
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded"
              />
              <Pin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pin to top</span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close asChild>
                <button type="button" className="px-4 py-2 text-sm rounded-md border hover:bg-muted transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Posting..." : "Post"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
