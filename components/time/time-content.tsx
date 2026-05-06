"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, Clock, Coffee, LogIn, LogOut, Search, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, formatDuration, formatDurationHuman } from "@/lib/utils";
import type { TimeEntryWithUser, TimeStatus, UserActivity } from "@/types";

interface TimeContentProps {
  userId: string;
  isAdmin: boolean;
}

type MainTab = "time" | "activity" | "reports";
type ActivityFilter = "all" | UserActivity["status"];
type ReportPreset = "today" | "week" | "month" | "last-month" | "custom";

// Always produces HH:MM:SS with leading zeros — used for the big elapsed display
function formatElapsed(ms: number): string {
  const totalSecs = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const BREAK_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour — consistent with activity tab

const STATUS_ORDER: Record<UserActivity["status"], number> = {
  on_clock: 0,
  on_break: 1,
  clocked_out: 2,
  not_active: 3,
};

function getStatusConfig(status: UserActivity["status"]) {
  switch (status) {
    case "on_clock":
      return {
        label: "On the Clock",
        dot: "bg-green-500 animate-pulse",
        badge: "bg-green-500/15 text-green-700 dark:text-green-400",
        filterBadge: "bg-green-500/20 text-green-700 dark:text-green-400",
        miniCardBg: "border-green-500/20 bg-green-500/5",
        miniCardText: "text-green-600 dark:text-green-400",
      };
    case "on_break":
      return {
        label: "On Break",
        dot: "bg-amber-500",
        badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        filterBadge: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
        miniCardBg: "border-amber-500/20 bg-amber-500/5",
        miniCardText: "text-amber-600 dark:text-amber-400",
      };
    case "clocked_out":
      return {
        label: "Clocked Out",
        dot: "bg-blue-400/70",
        badge: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        filterBadge: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
        miniCardBg: "border-blue-500/20 bg-blue-500/5",
        miniCardText: "text-blue-600 dark:text-blue-400",
      };
    case "not_active":
      return {
        label: "Not Active",
        dot: "bg-muted-foreground/30",
        badge: "bg-muted text-muted-foreground",
        filterBadge: "bg-muted text-muted-foreground",
        miniCardBg: "",
        miniCardText: "text-muted-foreground",
      };
  }
}

function entryMinutes(entry: TimeEntryWithUser): number {
  const out = entry.clockOut ? new Date(entry.clockOut).getTime() : Date.now();
  return Math.floor((out - new Date(entry.clockIn).getTime()) / 60000);
}

function sumMinutesSince(entries: TimeEntryWithUser[], since: Date): number {
  return entries
    .filter((e) => new Date(e.clockIn) >= since)
    .reduce((acc, e) => acc + entryMinutes(e), 0);
}

function groupByDay(entries: TimeEntryWithUser[]): Map<string, TimeEntryWithUser[]> {
  const map = new Map<string, TimeEntryWithUser[]>();
  for (const entry of entries) {
    const key = formatDate(entry.clockIn);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  return map;
}

function toInputDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function TimeContent({ userId, isAdmin }: TimeContentProps) {
  const tabs: MainTab[] = isAdmin ? ["time", "activity", "reports"] : ["time", "reports"];
  const tabLabels: Record<MainTab, string> = { time: "Time", activity: "Activity", reports: "Reports" };

  const [mainTab, setMainTab] = useState<MainTab>("time");
  const [status, setStatus] = useState<TimeStatus | null>(null);
  const [ownEntries, setOwnEntries] = useState<TimeEntryWithUser[]>([]);
  const [activeStaff, setActiveStaff] = useState<TimeEntryWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  // Activity tab
  const [activityData, setActivityData] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");

  // Reports tab
  const [reportAll, setReportAll] = useState(false);
  const [reportEntries, setReportEntries] = useState<TimeEntryWithUser[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ReportPreset>("month");

  const now = new Date();
  const [fromDate, setFromDate] = useState(
    toInputDate(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [toDate, setToDate] = useState(toInputDate(now));

  async function fetchStatus() {
    try {
      const res = await fetch("/api/time/status");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }

  async function fetchOwnEntries() {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const res = await fetch(`/api/time/entries?from=${from.toISOString()}`);
      if (res.ok) setOwnEntries(await res.json());
    } catch {}
  }

  async function fetchActiveStaff() {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/time/entries?all=true");
      if (res.ok) {
        const all: TimeEntryWithUser[] = await res.json();
        setActiveStaff(all.filter((e) => e.clockOut === null));
      }
    } catch {}
  }

  async function fetchActivity() {
    if (!isAdmin) return;
    setActivityLoading(true);
    try {
      const res = await fetch("/api/time/activity");
      if (res.ok) setActivityData(await res.json());
    } catch {}
    finally {
      setActivityLoading(false);
    }
  }

  async function loadReportEntries(all: boolean, from: string, to: string) {
    setReportLoading(true);
    try {
      const fromDt = new Date(from);
      const toDt = new Date(to);
      toDt.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({
        from: fromDt.toISOString(),
        to: toDt.toISOString(),
      });
      if (all && isAdmin) params.set("all", "true");
      const res = await fetch(`/api/time/entries?${params}`);
      if (res.ok) setReportEntries(await res.json());
    } catch {}
    finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchOwnEntries();
    fetchActiveStaff();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMainTabRef = useRef<string>("");
  useEffect(() => {
    if (mainTab === "reports" && prevMainTabRef.current !== "reports") {
      loadReportEntries(reportAll, fromDate, toDate);
    }
    if (mainTab === "activity" && prevMainTabRef.current !== "activity") {
      fetchActivity();
    }
    prevMainTabRef.current = mainTab;
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function clockIn() {
    setLoading(true);
    try {
      const res = await fetch("/api/time/clock-in", { method: "POST" });
      if (res.ok) {
        await Promise.all([fetchStatus(), fetchOwnEntries(), fetchActiveStaff()]);
        toast.success("Clocked in");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to clock in");
      }
    } catch {
      toast.error("Failed to clock in");
    } finally {
      setLoading(false);
    }
  }

  async function clockOut() {
    setLoading(true);
    try {
      const res = await fetch("/api/time/clock-out", { method: "POST" });
      if (res.ok) {
        await Promise.all([fetchStatus(), fetchOwnEntries(), fetchActiveStaff()]);
        toast.success("Clocked out");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to clock out");
      }
    } catch {
      toast.error("Failed to clock out");
    } finally {
      setLoading(false);
    }
  }

  async function startBreak() {
    setLoading(true);
    try {
      const res = await fetch("/api/time/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBreak: true }),
      });
      if (res.ok) {
        await Promise.all([fetchStatus(), fetchOwnEntries(), fetchActiveStaff()]);
        toast.success("Break started");
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to start break");
      }
    } catch {
      toast.error("Failed to start break");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: Exclude<ReportPreset, "custom">) {
    setSelectedPreset(preset);
    const n = new Date();
    let from: string, to: string;
    if (preset === "today") {
      from = to = toInputDate(n);
    } else if (preset === "week") {
      const ws = new Date(n);
      ws.setDate(n.getDate() - n.getDay());
      from = toInputDate(ws);
      to = toInputDate(n);
    } else if (preset === "month") {
      from = toInputDate(new Date(n.getFullYear(), n.getMonth(), 1));
      to = toInputDate(n);
    } else {
      from = toInputDate(new Date(n.getFullYear(), n.getMonth() - 1, 1));
      to = toInputDate(new Date(n.getFullYear(), n.getMonth(), 0));
    }
    setFromDate(from);
    setToDate(to);
    loadReportEntries(reportAll, from, to);
  }

  const isClockedIn = !!status?.active;
  const currentElapsed = status?.active
    ? Date.now() - new Date(status.active.clockIn).getTime()
    : 0;

  const lastClockOutDate = status?.lastClockOut ? new Date(status.lastClockOut) : null;
  const breakElapsedMs = lastClockOutDate ? Date.now() - lastClockOutDate.getTime() : 0;
  const isOnBreak = !isClockedIn && !!lastClockOutDate && breakElapsedMs < BREAK_THRESHOLD_MS;

  const myEntries = ownEntries.filter((e) => e.userId === userId);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayMinutes = sumMinutesSince(myEntries, startOfDay);
  const weekMinutes = sumMinutesSince(myEntries, weekStart);
  const monthMinutes = sumMinutesSince(myEntries, monthStart);

  const todayEntries = myEntries
    .filter((e) => new Date(e.clockIn) >= startOfDay)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());

  const liveTime = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const liveDate = new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // Reports
  const reportGrouped = groupByDay(reportEntries);
  const reportTotalMinutes = reportEntries.reduce((a, e) => a + entryMinutes(e), 0);
  const reportBreakMinutes = reportEntries.filter((e) => e.isBreak).reduce((a, e) => a + entryMinutes(e), 0);
  const reportWorkMinutes = reportTotalMinutes - reportBreakMinutes;
  const reportDays = reportGrouped.size;
  const reportUniqueUsers = new Set(reportEntries.map((e) => e.userId)).size;
  const reportAvgMinutes = reportDays > 0 ? Math.floor(reportWorkMinutes / reportDays) : 0;

  // Activity
  const sortedActivity = [...activityData].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );
  const filteredActivity = sortedActivity
    .filter((u) => {
      if (activityFilter === "all") return true;
      return u.status === activityFilter;
    })
    .filter(
      (u) =>
        activitySearch === "" ||
        u.name.toLowerCase().includes(activitySearch.toLowerCase())
    );
  const activityCounts = {
    all: activityData.length,
    on_clock: activityData.filter((u) => u.status === "on_clock").length,
    on_break: activityData.filter((u) => u.status === "on_break").length,
    clocked_out: activityData.filter((u) => u.status === "clocked_out").length,
    not_active: activityData.filter((u) => u.status === "not_active").length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              mainTab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {/* ── TIME TAB ── */}
      {mainTab === "time" && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">

          {/* LEFT: Clock + big circle button */}
          <div className="rounded-2xl border bg-card flex flex-col items-center justify-center gap-8 py-10 px-6 lg:min-h-[560px] lg:sticky lg:top-6">

            {/* Big elapsed / wall-clock display */}
            <div className="text-center select-none">
              <div
                className={cn(
                  "font-mono text-5xl sm:text-6xl font-bold tabular-nums tracking-tight leading-none transition-colors",
                  isClockedIn
                    ? "text-green-600 dark:text-green-400"
                    : isOnBreak
                    ? "text-amber-600 dark:text-amber-400"
                    : ""
                )}
              >
                {isClockedIn
                  ? formatElapsed(currentElapsed)
                  : isOnBreak
                  ? formatElapsed(breakElapsedMs)
                  : liveTime}
              </div>
              <p
                className={cn(
                  "text-sm mt-2",
                  isOnBreak ? "text-amber-500/80" : "text-muted-foreground"
                )}
              >
                {isClockedIn
                  ? "session time"
                  : isOnBreak
                  ? "on break"
                  : liveDate}
              </p>
            </div>

            {/* Circle button + break button */}
            <div className="flex flex-col items-center gap-4">
              {/* Break button floats above the circle; kept in DOM always to avoid layout shift */}
              <button
                onClick={startBreak}
                disabled={loading || !isClockedIn}
                className={cn(
                  "group flex items-center gap-2 px-5 py-2 rounded-full whitespace-nowrap",
                  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  "border border-amber-500/25 shadow-sm text-sm font-medium",
                  "hover:bg-amber-500/30 hover:border-amber-500/50",
                  "hover:-translate-y-1 hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25",
                  "active:scale-95 active:translate-y-0",
                  "transition-all duration-200 ease-out",
                  "disabled:cursor-not-allowed",
                  !isClockedIn && "invisible"
                )}
              >
                <Coffee className="h-4 w-4 transition-transform duration-200 group-hover:-rotate-12" />
                Take a Break
              </button>

              <div className="relative flex items-center justify-center w-52 h-52">
                {/* Pulse rings — green when working, amber when on break */}
                {(isClockedIn || isOnBreak) && (
                  <>
                    <span
                      className={cn(
                        "absolute w-52 h-52 rounded-full animate-ping pointer-events-none",
                        isClockedIn ? "bg-green-500/20" : "bg-amber-500/20"
                      )}
                      style={{ animationDuration: "2.4s" }}
                    />
                    <span
                      className={cn(
                        "absolute w-64 h-64 rounded-full animate-ping pointer-events-none",
                        isClockedIn ? "bg-green-500/12" : "bg-amber-500/12"
                      )}
                      style={{ animationDuration: "2.4s", animationDelay: "600ms" }}
                    />
                    <span
                      className={cn(
                        "absolute w-[19rem] h-[19rem] rounded-full animate-ping pointer-events-none",
                        isClockedIn ? "bg-green-500/8" : "bg-amber-500/8"
                      )}
                      style={{ animationDuration: "2.4s", animationDelay: "1200ms" }}
                    />
                  </>
                )}

                <button
                  onClick={isClockedIn ? clockOut : clockIn}
                  disabled={loading}
                  className={cn(
                    "relative z-10 w-52 h-52 rounded-full",
                    "flex flex-col items-center justify-center gap-2 select-none",
                    "text-white font-bold shadow-2xl",
                    "transition-all duration-300 active:scale-95",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
                    isClockedIn
                      ? "bg-gradient-to-b from-red-500 to-red-700 shadow-red-600/40"
                      : "bg-gradient-to-b from-green-500 to-green-700 shadow-green-600/40"
                  )}
                >
                  {loading ? (
                    <span className="text-sm font-medium">Working…</span>
                  ) : isClockedIn ? (
                    <>
                      <LogOut className="h-8 w-8 opacity-90" />
                      <span className="text-lg tracking-widest uppercase">Clock Out</span>
                    </>
                  ) : isOnBreak ? (
                    <>
                      <Coffee className="h-8 w-8 opacity-90" />
                      <span className="text-lg tracking-widest uppercase">Resume</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-8 w-8 opacity-90" />
                      <span className="text-lg tracking-widest uppercase">Clock In</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Status label */}
            <p className="text-sm text-muted-foreground text-center">
              {isClockedIn ? (
                <>
                  Clocked in at{" "}
                  <span className="font-semibold text-foreground">
                    {new Date(status!.active!.clockIn).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : isOnBreak ? (
                <>
                  Break since{" "}
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {lastClockOutDate!.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </>
              ) : (
                "Tap the button to start your session"
              )}
            </p>
          </div>

          {/* RIGHT: Status + stats + history */}
          <div className="space-y-4">
            <div
              className={cn(
                "rounded-2xl border p-5 transition-colors",
                isClockedIn
                  ? "border-green-500/30 bg-green-500/5"
                  : isOnBreak
                  ? "border-amber-500/30 bg-amber-500/5"
                  : "bg-card"
              )}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Current Status
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "w-3 h-3 rounded-full shrink-0 transition-colors",
                      isClockedIn
                        ? "bg-green-500 animate-pulse"
                        : isOnBreak
                        ? "bg-amber-500 animate-pulse"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xl font-bold",
                      isClockedIn
                        ? "text-green-600 dark:text-green-400"
                        : isOnBreak
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {isClockedIn ? "Active" : isOnBreak ? "On Break" : "Not Working"}
                  </span>
                </div>
                {isClockedIn && (
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 tabular-nums leading-none">
                      {formatElapsed(currentElapsed)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">session time</p>
                  </div>
                )}
                {isOnBreak && (
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-none">
                      {formatElapsed(breakElapsedMs)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">break time</p>
                  </div>
                )}
              </div>
            </div>

            <div
              className={cn(
                "grid gap-3",
                isAdmin ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
              )}
            >
              <StatCard
                icon={<Timer className="h-4 w-4" />}
                label="Today"
                value={formatDurationHuman(todayMinutes)}
                accent={isClockedIn}
              />
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                label="This Week"
                value={formatDurationHuman(weekMinutes)}
              />
              <StatCard
                icon={<Clock className="h-4 w-4" />}
                label="This Month"
                value={formatDurationHuman(monthMinutes)}
              />
              {isAdmin && (
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Active Now"
                  value={String(activeStaff.length)}
                  accent={activeStaff.length > 0}
                />
              )}
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Today&apos;s Sessions
                </h2>
                {todayEntries.length > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDurationHuman(todayMinutes)} total
                  </span>
                )}
              </div>
              {todayEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                  <Clock className="h-7 w-7 opacity-30" />
                  <p className="text-sm">No sessions today</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {todayEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          !entry.clockOut
                            ? "bg-green-500 animate-pulse"
                            : "bg-muted-foreground/30"
                        )}
                      />
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm font-mono tabular-nums">
                        <span>
                          {new Date(entry.clockIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-muted-foreground text-xs">→</span>
                        <span className={cn(!entry.clockOut && "text-green-600 dark:text-green-400")}>
                          {entry.clockOut
                            ? new Date(entry.clockOut).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Active"}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-mono tabular-nums shrink-0 font-medium",
                          !entry.clockOut
                            ? "text-green-600 dark:text-green-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {entry.clockOut
                          ? formatDurationHuman(entryMinutes(entry))
                          : formatDuration(Date.now() - new Date(entry.clockIn).getTime())}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAdmin && activeStaff.length > 0 && (
              <div className="rounded-xl border bg-card p-4 space-y-2">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Staff
                </h2>
                <div className="divide-y divide-border">
                  {activeStaff.map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                        <span className="text-sm font-medium">{e.user.name}</span>
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground font-mono">
                        {formatDuration(Date.now() - new Date(e.clockIn).getTime())}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB (admin only) ── */}
      {mainTab === "activity" && isAdmin && (
        <div className="space-y-4">
          {/* Status summary mini-cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["on_clock", "on_break", "clocked_out", "not_active"] as const).map((key) => {
              const cfg = getStatusConfig(key);
              return (
                <div key={key} className={cn("rounded-xl border bg-card p-4 space-y-1", cfg.miniCardBg)}>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                    <p className="text-xs text-muted-foreground truncate">{cfg.label}</p>
                  </div>
                  <p className={cn("text-2xl font-bold tabular-nums", cfg.miniCardText)}>
                    {activityCounts[key]}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Search + status filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search employees…"
                value={activitySearch}
                onChange={(e) => setActivitySearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {/* "All" pill */}
              <button
                onClick={() => setActivityFilter("all")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                  activityFilter === "all"
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                All
                <span className="opacity-60">({activityCounts.all})</span>
              </button>
              {(["on_clock", "on_break", "clocked_out", "not_active"] as const).map((key) => {
                const cfg = getStatusConfig(key);
                const isActive = activityFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActivityFilter(key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap",
                      isActive ? cfg.filterBadge : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                    {cfg.label}
                    <span className="opacity-60">({activityCounts[key]})</span>
                  </button>
                );
              })}
              <button
                onClick={fetchActivity}
                disabled={activityLoading}
                className="ml-auto px-3 py-1.5 rounded-lg border bg-background text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                {activityLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {/* Employee list */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {activityLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Loading activity…
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Users className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">
                  {activitySearch ? "No employees match your search" : "No employees found"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredActivity.map((user) => {
                  const cfg = getStatusConfig(user.status);
                  return (
                    <div
                      key={user.userId}
                      className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", cfg.dot)} />
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">
                        {user.name}
                      </span>
                      <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full shrink-0", cfg.badge)}>
                        {cfg.label}
                      </span>
                      <div className="text-right shrink-0 w-32 hidden sm:block">
                        {user.status === "not_active" ? (
                          <span className="text-xs text-muted-foreground">No activity today</span>
                        ) : user.status === "on_clock" ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              since{" "}
                              {new Date(user.clockIn!).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm font-mono tabular-nums font-semibold text-green-600 dark:text-green-400">
                              {formatDurationHuman(user.totalMinutes)}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              out at{" "}
                              {new Date(user.clockOut!).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-sm font-mono tabular-nums font-semibold text-muted-foreground">
                              {formatDurationHuman(user.totalMinutes)} total
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REPORTS TAB ── */}
      {mainTab === "reports" && (
        <>
          {/* Filter card */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Preset dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                  Period
                </label>
                <select
                  value={selectedPreset}
                  onChange={(e) => {
                    const v = e.target.value as ReportPreset;
                    if (v === "custom") {
                      setSelectedPreset("custom");
                    } else {
                      applyPreset(v);
                    }
                  }}
                  className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* All Staff toggle — admin only */}
              {isAdmin && (
                <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
                  {([false, true] as const).map((v) => (
                    <button
                      key={String(v)}
                      onClick={() => {
                        setReportAll(v);
                        loadReportEntries(v, fromDate, toDate);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                        reportAll === v
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {v ? "All Staff" : "My Data"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Custom date inputs — only shown when "Custom Range" is selected */}
            {selectedPreset === "custom" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <button
                  onClick={() => loadReportEntries(reportAll, fromDate, toDate)}
                  disabled={reportLoading}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {reportLoading ? "Loading…" : "Apply"}
                </button>
              </div>
            )}
          </div>

          {/* Summary stat cards */}
          {reportLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<Timer className="h-4 w-4" />}
                label="Work Hours"
                value={formatDurationHuman(reportWorkMinutes)}
              />
              <StatCard
                icon={<Coffee className="h-4 w-4" />}
                label="Break Time"
                value={formatDurationHuman(reportBreakMinutes)}
                muted
              />
              <StatCard
                icon={<BarChart2 className="h-4 w-4" />}
                label="Days Worked"
                value={String(reportDays)}
              />
              {reportAll && isAdmin ? (
                <StatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Team Members"
                  value={String(reportUniqueUsers)}
                />
              ) : (
                <StatCard
                  icon={<Clock className="h-4 w-4" />}
                  label="Avg / Day"
                  value={formatDurationHuman(reportAvgMinutes)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
  muted = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-1",
        accent && "border-green-500/30 bg-green-500/5",
        muted && "border-amber-500/20 bg-amber-500/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          accent && "text-green-600 dark:text-green-400",
          muted && "text-amber-600 dark:text-amber-400"
        )}
      >
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          accent && "text-green-600 dark:text-green-400",
          muted && "text-amber-600 dark:text-amber-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
