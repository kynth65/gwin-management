"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock, LogOut, Timer } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDuration, formatDurationHuman } from "@/lib/utils";
import type { TimeStatus } from "@/types";

export function TimeTracker() {
  const [status, setStatus] = useState<TimeStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/time/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // silent fail — non-critical widget
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Tick elapsed every second when clocked in
  useEffect(() => {
    if (!status?.active) { setElapsed(0); return; }
    const clockInMs = new Date(status.active.clockIn).getTime();
    const tick = () => setElapsed(Date.now() - clockInMs);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status?.active]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function clockIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/time/clock-in", { method: "POST" });
      if (res.ok) { await fetchStatus(); toast.success("Clocked in"); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed to clock in"); }
    } catch { toast.error("Failed to clock in"); }
    finally { setLoading(false); }
  }

  async function clockOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/time/clock-out", { method: "POST" });
      if (res.ok) { await fetchStatus(); toast.success("Clocked out"); setOpen(false); }
      else { const d = await res.json(); toast.error(d.error ?? "Failed to clock out"); }
    } catch { toast.error("Failed to clock out"); }
    finally { setLoading(false); }
  }

  const isClockedIn = !!status?.active;
  const todayWithLive = (status?.todayTotal ?? 0) + Math.floor(elapsed / 60000);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => isClockedIn ? setOpen((v) => !v) : clockIn()}
        disabled={loading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50",
          isClockedIn
            ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 dark:text-green-400"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        aria-label={isClockedIn ? "Time tracker options" : "Clock in"}
      >
        {isClockedIn ? (
          <>
            <Timer className="h-4 w-4 shrink-0" />
            <span className="tabular-nums text-xs">{formatDuration(elapsed)}</span>
          </>
        ) : (
          <Clock className="h-4 w-4" />
        )}
      </button>

      {open && isClockedIn && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-card border rounded-xl shadow-2xl z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-semibold">Time Tracker</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              In at{" "}
              {new Date(status!.active!.clockIn).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="px-4 py-3 space-y-0.5">
            <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400 tabular-nums">
              {formatDuration(elapsed)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today total: {formatDurationHuman(todayWithLive)}
            </p>
          </div>
          <div className="px-4 pb-3">
            <button
              onClick={clockOut}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              Clock Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
