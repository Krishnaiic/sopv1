"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

function timeAgo(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return `just now`;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
};

type ListResponse =
  | {
      success: true;
      data: {
        items: NotificationItem[];
        totalCount: number;
        page: number;
        pageSize: number;
        totalPages: number;
      };
    }
  | { success: false; error: { code: string; message: string } };

const DEFAULT_PAGE_SIZE = 20;

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, size: number) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/notifications", window.location.origin);
      url.searchParams.set("page", String(p));
      url.searchParams.set("pageSize", String(size));
      const res = await fetch(url.toString(), { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as ListResponse;
      if (!res.ok || data.success === false) {
        setError(data.success === false ? data.error.message : "Failed to load notifications.");
        setItems([]);
        return;
      }
      setItems(data.data.items);
      setTotalCount(data.data.totalCount);
      setTotalPages(data.data.totalPages);
      setPage(data.data.page);
    } finally {
      setLoading(false);
    }
  }, []);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await fetch("/api/notifications/mark-all-read", { method: "POST", credentials: "include" }).catch(() => {});
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    void fetchPage(page, pageSize);
  }, [ready, page, pageSize, fetchPage]);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageNumbers = (() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start + 1 < maxButtons) start = Math.max(1, end - maxButtons + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Management</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">Your system and document alerts.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          {loading ? "Loading…" : `${totalCount} notification${totalCount === 1 ? "" : "s"} total`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="notif-page-size" className="text-xs font-medium text-slate-500">
            Per page
          </label>
          <select
            id="notif-page-size"
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(next);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading notifications…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No notifications found.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((n) => (
              <li key={n.id} className={`p-5 transition-colors ${n.isRead ? "bg-white" : "bg-slate-50"}`}>
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-1.5 flex h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-slate-300" : "bg-blue-600"}`}
                  />
                  <div className="flex-1 space-y-1">
                    {n.link ? (
                      <Link href={n.link} className="font-medium text-slate-900 hover:text-blue-600">
                        {n.title}
                      </Link>
                    ) : (
                      <p className="font-medium text-slate-900">{n.title}</p>
                    )}
                    <p className="text-sm text-slate-600">{n.message}</p>
                    <p className="text-xs text-slate-400 font-medium pt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalCount > 0 ? (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
            {loading ? " · …" : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center gap-1">
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={loading}
                    onClick={() => setPage(num)}
                    className={
                      num === page
                        ? "min-w-[2.25rem] rounded-lg bg-slate-900 px-2 py-1.5 text-sm font-medium text-white"
                        : "min-w-[2.25rem] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    }
                  >
                    {num}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              disabled={!canNext || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
