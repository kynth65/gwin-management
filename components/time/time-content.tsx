"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart2, Clock, LogIn, LogOut, Timer, Users } from "lucide-react";
import { toast } from "sonner";
import { cn, formatDate, formatDuration, formatDurationHuman } from "@/lib/utils";
import type { TimeEntryWithUser, TimeStatus } from "@/types";

interface TimeContentProps {
  userId: string;
  isAdmin: boolean;
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
  const [mainTab, setMainTab] = useState<"time" | "reports">("time");
  const [status, setStatus] = useState<TimeStatus | null>(null);
  const [ownEntries, setOwnEntries] = useState<TimeEntryWithUser[]>([]);
  const [activeStaff, setActiveStaff] = useState<TimeEntryWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setTick] = useState(0);

  const [reportAll, setReportAll] = useState(false);
  const [reportEntries, setReportEntries] = useState<TimeEntryWithUser[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

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
    prevMainTabRef.current = mainTab;
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Second ticker — drives live elapsed in all Date.now() calls
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

  function applyPreset(preset: "today" | "week" | "month" | "last-month") {
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

  const reportGrouped = groupByDay(reportEntries);
  const reportTotalMinutes = reportEntries.reduce((a, e) => a + entryMinutes(e), 0);
  const reportDays = reportGrouped.size;
  const reportUniqueUsers = new Set(reportEntries.map((e) => e.userId)).size;
  const reportAvgMinutes = reportDays > 0 ? Math.floor(reportTotalMinutes / reportDays) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit">
        {(["time", "reports"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              mainTab === t
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "time" ? "Time" : "Reports"}
          </button>
        ))}
      </div>

      {/* ── TIME TAB ── */}
      {mainTab === "time" && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">

          {/* LEFT: Clock + big circle button */}
          <div className="rounded-2xl border bg-card flex flex-col items-center justify-center gap-8 py-10 px-6 lg:min-h-[560px] lg:sticky lg:top-6">
            {/* Live wall clock */}
            <div className="text-center select-none">
              <div className="font-mono text-5xl sm:text-6xl font-bold tabular-nums tracking-tight leading-none">
                {liveTime}
              </div>
              <p className="text-sm text-muted-foreground mt-2">{liveDate}</p>
            </div>

            {/* Circle button with emanating pulse rings */}
            <div className="relative flex items-center justify-center w-52 h-52">
              {isClockedIn && (
                <>
                  <span
                    className="absolute w-52 h-52 rounded-full bg-green-500/20 animate-ping"
                    style={{ animationDuration: "2.4s" }}
                  />
                  <span
                    className="absolute w-64 h-64 rounded-full bg-green-500/12 animate-ping"
                    style={{ animationDuration: "2.4s", animationDelay: "600ms" }}
                  />
                  <span
                    className="absolute w-[19rem] h-[19rem] rounded-full bg-green-500/8 animate-ping"
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
                    <span className="text-sm font-mono tabular-nums opacity-80">
                      {formatDuration(currentElapsed)}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-8 w-8 opacity-90" />
                    <span className="text-lg tracking-widest uppercase">Clock In</span>
                  </>
                )}
              </button>
            </div>

            {/* Status label below circle */}
            <p className="text-sm text-muted-foreground text-center">
              {isClockedIn ? (
                <>
                  Started at{" "}
                  <span className="font-semibold text-foreground">
                    {new Date(status!.active!.clockIn).toLocaleTimeString([], {
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
            {/* Current Status card */}
            <div
              className={cn(
                "rounded-2xl border p-5 transition-colors",
                isClockedIn ? "border-green-500/30 bg-green-500/5" : "bg-card"
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
                      isClockedIn ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xl font-bold",
                      isClockedIn
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground"
                    )}
                  >
                    {isClockedIn ? "Active" : "Not Working"}
                  </span>
                </div>
                {isClockedIn && (
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 tabular-nums leading-none">
                      {formatDuration(currentElapsed)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">session time</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stat cards */}
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

            {/* Today's Sessions history */}
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
                        <span
                          className={cn(
                            !entry.clockOut && "text-green-600 dark:text-green-400"
                          )}
                        >
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
                          : formatDuration(
                              Date.now() - new Date(entry.clockIn).getTime()
                            )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active staff list (admin only) */}
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

      {/* ── REPORTS TAB ── */}
      {mainTab === "reports" && (
        <>
          {/* Filter card */}
          <div className="rounded-xl border bg-card p-4 space-y-4">
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["today", "Today"],
                  ["week", "This Week"],
                  ["month", "This Month"],
                  ["last-month", "Last Month"],
                ] as const
              ).map(([preset, label]) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted hover:bg-accent transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
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

            {/* Admin: My Data / All Staff toggle */}
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

          {/* Summary stat cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Total Hours"
              value={formatDurationHuman(reportTotalMinutes)}
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
                icon={<Timer className="h-4 w-4" />}
                label="Avg / Day"
                value={formatDurationHuman(reportAvgMinutes)}
              />
            )}
          </div>

          {/* Entries table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            {reportLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                Loading entries…
              </div>
            ) : reportGrouped.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="h-8 w-8 mb-3 opacity-40" />
                <p className="text-sm">No entries in this date range</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {Array.from(reportGrouped.entries()).map(([day, dayEntries]) => {
                  const dayTotal = dayEntries.reduce((a, e) => a + entryMinutes(e), 0);
                  return (
                    <div key={day}>
                      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {day}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDurationHuman(dayTotal)}
                        </span>
                      </div>
                      {dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors"
                        >
                          {reportAll && isAdmin && (
                            <span className="text-sm font-medium w-28 shrink-0 truncate">
                              {entry.user.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <span className="tabular-nums">
                              {new Date(entry.clockIn).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>→</span>
                            <span
                              className={cn(
                                "tabular-nums",
                                !entry.clockOut &&
                                  "text-green-600 dark:text-green-400 font-medium"
                              )}
                            >
                              {entry.clockOut
                                ? new Date(entry.clockOut).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Active"}
                            </span>
                          </div>
                          <div className="ml-auto shrink-0">
                            <span
                              className={cn(
                                "text-sm font-mono tabular-nums",
                                !entry.clockOut && "text-green-600 dark:text-green-400"
                              )}
                            >
                              {entry.clockOut
                                ? formatDurationHuman(entryMinutes(entry))
                                : formatDuration(
                                    Date.now() - new Date(entry.clockIn).getTime()
                                  )}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 space-y-1",
        accent && "border-green-500/30 bg-green-500/5"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          accent && "text-green-600 dark:text-green-400"
        )}
      >
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          accent && "text-green-600 dark:text-green-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}
