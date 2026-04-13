"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDeleteModal } from "@/components/admin/confirm-delete-modal";

type Department = {
  id: string;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
  subDepartments?: { id: string; name: string }[];
};

type ApiResponse =
  | {
      success: true;
      data: {
        departments?: Department[];
        total?: number;
        department?: Department;
      };
      message?: string;
    }
  | { success: false; error: { code: string; message: string } };

const PAGE_SIZE = 10;

export default function DepartmentsListClient() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const canCreate = useMemo(() => {
    return name.trim().length >= 2;
  }, [name]);

  const prevSearchDebounced = useRef(searchDebounced);

  async function load(overridePage?: number) {
    const p = overridePage ?? page;
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/departments", window.location.origin);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String((p - 1) * PAGE_SIZE));
      if (searchDebounced.trim()) url.searchParams.set("search", searchDebounced.trim());
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || data.success === false) {
        setError("Unable to load departments.");
        return;
      }
      setDepartments(data.data.departments ?? []);
      setTotal(data.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced]);

  useEffect(() => {
    const usePageOne = searchDebounced !== prevSearchDebounced.current;
    if (usePageOne) prevSearchDebounced.current = searchDebounced;
    void load(usePageOne ? 1 : undefined);
  }, [page, searchDebounced]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || data.success === false) {
        setError(data.success === false ? data.error.message : "Unable to create department.");
        return;
      }
      setName("");
      setShowCreateModal(false);
      setPage(1);
      await load();
    } finally {
      setCreating(false);
    }
  }

  function openDeleteModal(d: Department) {
    setDeleteTarget(d);
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/departments/${encodeURIComponent(deleteTarget.id)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || data.success === false) {
        setError("Unable to delete department.");
        return;
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }

  function openEdit(d: Department) {
    setEditing(d);
    setEditName(d.name);
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`/api/departments/${encodeURIComponent(editing.id)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;
      if (!res.ok || data.success === false) {
        setError("Unable to update department.");
        return;
      }
      setEditing(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-8 px-1 py-6">
      {/* Integrated Header */}
      <div className="relative border-b border-slate-100 pb-8">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-bold uppercase tracking-[0.2em] no-scrollbar">
          <span className="text-blue-600 transition-colors">Organization</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">DEPARTMENTS</span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                Departments
              </h1>
            </div>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-500 mt-2">
              Manage the primary organizational departments. Each department contains specialized sub-divisions, libraries, and assigned personnel.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-slate-900 px-6 text-sm font-black uppercase tracking-wider text-white shadow-lg transition-all hover:bg-slate-800 hover:shadow-xl hover:scale-[1.02] active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Filter departments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </span>
            ) : (
              <span>Viewing {start}–{end} of {total} Units</span>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departments.map((d) => (
          <div
            key={d.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/admin/departments/${d.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/admin/departments/${d.id}`);
              }
            }}
            className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 focus:outline-none focus:ring-4 focus:ring-blue-50"
          >
            <div className="flex flex-1 flex-col">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">{d.name}</h2>
              <div className="mt-3 flex flex-wrap gap-1.5 font-medium text-slate-500">
                {d.subDepartments?.length ? (
                  d.subDepartments.slice(0, 3).map((sub, i) => (
                    <span key={sub.id} className="text-xs">
                      {sub.name}{i < Math.min(d.subDepartments?.length ?? 0, 3) - 1 ? " • " : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Structural Unit — Primary</span>
                )}
                {d.subDepartments && d.subDepartments.length > 3 && (
                  <span className="text-[11px] font-bold text-blue-600">+{d.subDepartments.length - 3} more</span>
                )}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => openEdit(d)}
                className="rounded-xl p-2.5 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-900"
                title="Edit"
                aria-label="Edit department"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => router.push(`/admin/departments/${d.id}/subdepartments`)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-white px-3 py-2 text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                title="Sub department"
                aria-label="Sub department"
              >
                <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                </svg>
                <span className="text-[11px] font-black uppercase tracking-tight">Sub departments</span>
              </button>
              <button
                type="button"
                onClick={() => openDeleteModal(d)}
                className="ml-auto rounded-xl p-2.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                title="Delete"
                aria-label="Delete department"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {departments.length === 0 && !loading ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-slate-600">
            No departments yet.
          </div>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Page {page} of {totalPages} — Total {total} Records
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-tight text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-tight text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDeleteModal
        open={!!deleteTarget}
        title="Delete department"
        message={deleteTarget ? `Delete department "${deleteTarget.name}"?\n\nThis will soft-delete the department and hide it from lists.` : ""}
        confirmLabel="Delete"
        onConfirm={onConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create department</h2>
                <p className="mt-1 text-sm text-slate-600">Add a new department. Department Admin can be mapped later from User Management.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Department name</label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Operations"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={!canCreate || creating}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {creating ? "Creating…" : "Create department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit department</h2>
                <p className="mt-1 text-sm text-slate-600">Update department name.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={savingEdit || editName.trim().length < 2}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingEdit ? "Saving…" : "Save changes"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
