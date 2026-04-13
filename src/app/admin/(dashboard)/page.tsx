"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type DashboardStats = {
  totalSops: number;
  totalPolicies: number;
  totalDocuments: number;
  pendingApprovals: number;
  upcomingReviews: number;
  sopCounts?: { total: number; unpublished: number; published: number };
  policyCounts?: { total: number; unpublished: number; published: number };
  distribution: { id: string; name: string; count: number }[];
  recentPolicies: {
    id: string;
    serialNo: string;
    title: string;
    type: string;
    version: number;
    departmentName: string;
    updatedAt: string;
  }[];
};

type LogRow = {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  entityTitle: string | null;
  actor: { id: string; name: string; email: string; role: string } | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} days ago`;
  return d.toLocaleDateString();
}

function actionDotClass(action: string) {
  switch (action) {
    case "LOGIN":
    case "LOGOUT":
      return "bg-blue-500";
    case "CREATE":
      return "bg-emerald-500";
    case "UPDATE":
    case "SOFT_DELETE":
    case "RESTORE":
    case "PUBLISH":
    case "UNPUBLISH":
    case "SUBMIT_FOR_APPROVAL":
    case "APPROVE":
    case "REJECT":
    case "ESCALATE":
      return "bg-amber-500";
    case "DELETE":
      return "bg-red-500";
    default:
      return "bg-slate-400";
  }
}

function actionRowClass(action: string) {
  switch (action) {
    case "LOGIN":
    case "LOGOUT":
      return "bg-blue-50/60 hover:bg-blue-50";
    case "CREATE":
      return "bg-emerald-50/60 hover:bg-emerald-50";
    case "UPDATE":
    case "SOFT_DELETE":
    case "RESTORE":
    case "PUBLISH":
    case "UNPUBLISH":
    case "SUBMIT_FOR_APPROVAL":
    case "APPROVE":
    case "REJECT":
    case "ESCALATE":
      return "bg-amber-50/60 hover:bg-amber-50";
    case "DELETE":
      return "bg-red-50/60 hover:bg-red-50";
    default:
      return "hover:bg-slate-50";
  }
}

function actionLabel(action: string) {
  return action.toLowerCase().replace(/_/g, " ");
}

// ─── Pie chart colours ────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#BFDBFE", // blue-200
  "#DDD6FE", // violet-200
  "#A7F3D0", // emerald-200
  "#FDE68A", // amber-200
  "#FECACA", // red-200
  "#A5F3FC", // cyan-200
  "#FBCFE8", // pink-200
  "#D9F99D", // lime-200
  "#FED7AA", // orange-200
  "#C7D2FE", // indigo-200
];

// ─── Custom tooltip for pie chart ─────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: { name: string; value: number; payload: { name: string; count: number } }[];
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0] as any;
  return (
    <div className="rounded-xl border border-white bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl text-sm ring-1 ring-slate-200/50">
      <div className="flex items-center gap-2.5 mb-1.5">
        <div className="h-2.5 w-2.5 rounded-full shadow-inner" style={{ backgroundColor: entry.payload.fill }} />
        <p className="font-bold text-slate-900 tracking-tight">{entry.payload.name}</p>
      </div>
      <div className="flex items-baseline gap-1.5 pl-5">
        <span className="font-black text-slate-900 text-lg leading-none">{entry.value}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SOP Documents</span>
      </div>
    </div>
  );
}

// ─── Custom legend ─────────────────────────────────────────────────────────────

interface LegendEntry {
  value: string;
  color: string;
  payload: { count: number };
}

function CustomLegend({ payload }: { payload?: LegendEntry[] }) {
  if (!payload) return null;
  return (
    <div className="flex flex-col gap-4">
      <div className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Department Breakdown</p>
      </div>
      <ul className="flex flex-col gap-3 py-1 max-h-[280px] overflow-y-auto pr-3 custom-scrollbar">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-4 text-[13px] group cursor-default py-0.5">
            <div
              className="h-4 w-4 shrink-0 rounded-md shadow-sm transition-all duration-300 group-hover:scale-110"
              style={{ backgroundColor: entry.color }}
            />
            <span className="truncate text-slate-500 group-hover:text-slate-900 transition-colors flex-1 font-semibold tracking-tight" title={entry.value}>
              {entry.value}
            </span>
            <span className="shrink-0 font-black text-slate-900 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg text-[11px] group-hover:bg-blue-50 group-hover:border-blue-100 transition-all">
              {entry.payload.count} <span className="text-[9px] font-bold text-slate-400 ml-0.5">SOPs</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-100 ${className ?? ""}`}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let cancelled = false;
    setStatsLoading(true);
    setLogsLoading(true);

    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setStats(data.data);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });

    fetch("/api/audit-logs?limit=10")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) setLogs(data.data.logs ?? []);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  const sopCounts = stats?.sopCounts ?? {
    total: stats?.totalSops ?? 0,
    unpublished: 0,
    published: 0,
  };
  const distribution = stats?.distribution ?? [];
  const totalDistribution = distribution.reduce((s, d) => s + d.count, 0);

  // Pie chart data — filter out zero-count depts so chart is clean
  const pieData = distribution.filter((d) => d.count > 0);

  return (
    <div className="space-y-7">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back! Here&apos;s what&apos;s happening in the SOP management portal today.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Total SOPs */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total SOPs</p>
              {statsLoading ? (
                <Skeleton className="mt-1 h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-slate-900">{sopCounts.total.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Unpublished */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unpublished</p>
              {statsLoading ? (
                <Skeleton className="mt-1 h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-slate-900">{sopCounts.unpublished.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Published */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Published</p>
              {statsLoading ? (
                <Skeleton className="mt-1 h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold text-slate-900">{sopCounts.published.toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Activity Feed</h2>
          <Link
            href="/admin/logs"
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition"
          >
            View all →
          </Link>
        </div>
        <ul className="max-h-[320px] overflow-y-auto divide-y divide-slate-50">
          {logsLoading ? (
            <li className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </li>
          ) : logs.length === 0 ? (
            <li className="px-5 py-10 text-center text-sm text-slate-400">No recent activity.</li>
          ) : (
            logs.map((l) => (
              <li key={l.id}>
                <Link
                  href="/admin/logs"
                  className={`block px-5 py-3 transition ${actionRowClass(l.action)}`}
                >
                  <div className="flex gap-3">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${actionDotClass(l.action)}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{l.actor ? l.actor.name : "System"}</span>{" "}
                        {actionLabel(l.action)} {l.entityType}
                        {l.entityTitle ? ` — ${l.entityTitle}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">{formatTimeAgo(l.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* ── SOP Distribution pie chart + Review Reminders ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pie Chart card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">SOP Distribution by Department</h2>
              {!statsLoading && (
                <p className="mt-0.5 text-xs text-slate-400">
                  {totalDistribution} total SOP{totalDistribution !== 1 ? "s" : ""} across{" "}
                  {distribution.length} department{distribution.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <div className="p-5">
            {statsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-32 w-32 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin" />
                  <p className="text-sm text-slate-400">Loading chart…</p>
                </div>
              </div>
            ) : distribution.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">No departments found yet.</p>
              </div>
            ) : pieData.length === 0 ? (
              /* All departments have 0 SOPs — show a table placeholder instead */
              <div className="space-y-2">
                <p className="text-xs text-slate-400 mb-3">No SOPs have been assigned to departments yet.</p>
                {distribution.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                    <span className="font-medium text-slate-700 truncate">{d.name}</span>
                    <span className="shrink-0 ml-4 text-slate-400">0 SOPs</span>
                  </div>
                ))}
              </div>
            ) : !isMounted ? (
              <div className="flex items-center justify-center py-16">
                 <div className="h-32 w-32 rounded-full border-4 border-slate-100 border-t-blue-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-8 items-center">
                {/* Recharts pie */}
                <div className="relative w-full sm:w-[320px] shrink-0 h-[320px] group/chart flex items-center justify-center">
                  {/* Subtle background glow */}
                  <div className="absolute inset-0 bg-radial-[at_50%_50%] from-blue-50/40 to-transparent scale-125 opacity-0 group-hover/chart:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={0}
                        outerRadius={140}
                        paddingAngle={0}
                        animationDuration={1200}
                        animationBegin={100}
                        onMouseEnter={(_, index) => setActiveIndex(index)}
                        onMouseLeave={() => setActiveIndex(null)}
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={entry.id}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                            opacity={activeIndex === null || activeIndex === index ? 1 : 0.7}
                            style={{ 
                              cursor: "pointer", 
                              transition: "all 0.4s ease-out",
                              filter: activeIndex === index 
                                ? "drop-shadow(0px 8px 16px rgba(0,0,0,0.08))" 
                                : "none",
                              transform: activeIndex === index ? 'scale(1.02)' : 'scale(1)',
                              transformOrigin: '50% 50%'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 min-w-0 w-full">
                  <CustomLegend
                    payload={pieData.map((d, i) => ({
                      value: d.name,
                      color: PIE_COLORS[i % PIE_COLORS.length],
                      payload: { count: d.count },
                    }))}
                  />

                  {/* Total summary */}
                  <div className="mt-8 flex items-center gap-4 rounded-3xl bg-slate-50/70 border border-slate-100/50 px-5 py-4 transition-all hover:bg-slate-50 cursor-default">
                    <div className="h-11 w-11 shrink-0 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100 text-blue-500">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[10px] uppercase font-black tracking-[0.15em] text-slate-400 mb-0.5">SOP OVERVIEW</p>
                      <p className="text-base font-black text-slate-900 leading-none">
                        {totalDistribution} Total <span className="font-medium text-slate-500">SOP Documents</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Review Reminders */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Review Reminders</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
              3–6 months
            </span>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mx-auto mt-4">
              <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM12 15h.008v.008H12V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9.75 15h.008v.008H9.75V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM9.75 12h.008v.008H9.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM15 15h.008v.008H15V15zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM15 12h.008v.008H15V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-center text-sm text-slate-500 leading-relaxed">
              No review reminders in this window yet.
            </p>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400 leading-relaxed">
              When documents have review dates set, they will appear here 3–6 months before they are due.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
