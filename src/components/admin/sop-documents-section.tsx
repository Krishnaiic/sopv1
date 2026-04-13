"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toastSuccess } from "@/lib/app-toast";
import { DownloadLink } from "@/components/download-link";

export type SopListTab = "all" | "pending" | "approved" | "archived";

type SopRow = {
  id: string;
  serialNo: string;
  title: string;
  status: string;
  currentVersion: number;
  versionLabel?: string;
  isPublished: boolean;
  updatedAt: string;
  archiveReason?: string | null;
  archivedAt?: string | null;
  pendingApprovalRequestId: string | null;
  canSubmitForApproval: boolean;
  canActAsApprover: boolean;
  canRejectAsApprover: boolean;
  canEscalateToAdmin: boolean;
  canDeptEndorseSop: boolean;
  deptEndorsed: boolean;
  canDeleteUnpublished: boolean;
  canArchivePublished: boolean;
  canDownloadPdf: boolean;
  fileKind?: string;
};

type PolicyRow = {
  id: string;
  serialNo: string;
  title: string;
  status: string;
  currentVersion: number;
  isPublished: boolean;
  updatedAt: string;
};

function formatStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "ARCHIVED":
      return "Archived";
    default:
      return status.replaceAll("_", " ");
  }
}

type LoadedMeta = {
  department?: { id: string; name: string };
  subDepartment?: {
    id: string;
    name: string;
    departmentId: string;
    departmentName: string;
  };
};

type Props = {
  /** e.g. `/api/departments/:id/sops` or `/api/subdepartments/:id/documents` */
  listUrl: string;
  sopSectionTitle?: string;
  policiesTitle?: string;
  /** Breadcrumb / header info from the same API response */
  onLoaded?: (meta: LoadedMeta) => void;
  /** If true, the tab switcher (All/Pending/Approved) is hidden. */
  forceSingleList?: boolean;
  /** Optional: explicitly control which SOP tabs show. */
  enabledTabs?: SopListTab[];
  /** Items per page for local pagination. Defaults to 10. */
  itemsPerPage?: number;
};

export function SopDocumentsSection({
  listUrl,
  sopSectionTitle = "SOPs",
  policiesTitle = "Policies",
  onLoaded,
  forceSingleList = false,
  enabledTabs,
  itemsPerPage = 10,
}: Props) {
  const canShowTab = useCallback(
    (t: SopListTab) => !enabledTabs || enabledTabs.includes(t),
    [enabledTabs],
  );
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const [tab, setTab] = useState<SopListTab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sops, setSops] = useState<SopRow[]>([]);
  const [showSopTabs, setShowSopTabs] = useState(false);
  const [policies, setPolicies] = useState<PolicyRow[] | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [orgAdmins, setOrgAdmins] = useState<{ id: string; name: string; email: string }[]>([]);
  const [submitApprovers, setSubmitApprovers] = useState<{ id: string; name: string; email: string; role: string }[]>(
    [],
  );
  const [escalateTargetByDoc, setEscalateTargetByDoc] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveForDocId, setArchiveForDocId] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveReasonFor, setArchiveReasonFor] = useState<SopRow | null>(null);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [submitForApprovalDocId, setSubmitForApprovalDocId] = useState<string | null>(null);
  const [submitApproverId, setSubmitApproverId] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  const tabQuery =
    tab === "pending"
      ? "pending"
      : tab === "approved"
        ? "approved"
        : tab === "archived"
          ? "archived"
          : "all";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${listUrl}?tab=${encodeURIComponent(tabQuery)}`);
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          sops?: SopRow[];
          showSopTabs?: boolean;
          policies?: PolicyRow[];
        };
        error?: { message?: string };
      };
      if (!res.ok || payload.success === false) {
        setError(payload.error?.message ?? "Unable to load documents.");
        return;
      }
      const d = payload.data;
      setSops(d?.sops ?? []);
      setShowSopTabs(d?.showSopTabs ?? false);
      if (d && "policies" in d && Array.isArray(d.policies)) {
        setPolicies(d.policies);
      } else {
        setPolicies(null);
      }
      if (d) {
        const meta: LoadedMeta = {};
        if ("department" in d && d.department) meta.department = d.department as LoadedMeta["department"];
        if ("subDepartment" in d && d.subDepartment) {
          meta.subDepartment = d.subDepartment as LoadedMeta["subDepartment"];
        }
        if (meta.department || meta.subDepartment) onLoadedRef.current?.(meta);
      }
    } finally {
      setLoading(false);
    }
  }, [listUrl, tabQuery]);

  async function onUnarchive(docId: string) {
    setActionError(null);
    setBusyId(docId);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/unarchive`, { method: "POST" });
      const payload = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || payload.success === false) {
        setActionError(payload.error?.message ?? "Failed to unarchive SOP.");
        return;
      }
      toastSuccess("SOP unarchived.");
      setTab("all");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    setCurrentPage(1);
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { user?: { role?: string } } }>)
      .then((d) => {
        if (cancelled || !d.success || !d.data?.user?.role) return;
        setViewerRole(d.data.user.role);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewerRole !== "DEPARTMENT_ADMIN") return;
    let cancelled = false;
    Promise.all([
      fetch("/api/users/org-admins").then((r) => r.json()),
      fetch("/api/users/sop-submit-approvers").then((r) => r.json()),
    ])
      .then(([adminsRes, submitRes]) => {
        if (cancelled) return;
        const a = adminsRes as { success?: boolean; data?: { users?: { id: string; name: string; email: string }[] } };
        const s = submitRes as {
          success?: boolean;
          data?: { users?: { id: string; name: string; email: string; role: string }[] };
        };
        if (a.success && a.data?.users) setOrgAdmins(a.data.users);
        if (s.success && s.data?.users) setSubmitApprovers(s.data.users);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [viewerRole]);

  async function postJson(url: string, body?: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: { message?: string };
    };
    return { ok: res.ok && data.success !== false, message: data.error?.message ?? "Request failed" };
  }

  function openSendForApproval(docId: string) {
    setActionError(null);
    if (viewerRole === "DEPARTMENT_ADMIN") {
      setSubmitForApprovalDocId(docId);
      setSubmitApproverId(submitApprovers[0]?.id ?? "");
      setSubmitError(null);
      return;
    }
    void submitForApprovalDirect(docId, undefined, false);
  }

  useEffect(() => {
    if (!submitForApprovalDocId || submitApprovers.length === 0) return;
    setSubmitApproverId((current) => current || submitApprovers[0]!.id);
  }, [submitForApprovalDocId, submitApprovers]);

  async function submitForApprovalDirect(
    docId: string,
    approverUserId: string | undefined,
    fromModal: boolean,
  ) {
    setActionError(null);
    if (fromModal) setSubmitError(null);
    setBusyId(docId);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}/submit-for-approval`, {
        method: "POST",
        headers:
          approverUserId !== undefined
            ? { "Content-Type": "application/json" }
            : undefined,
        body:
          approverUserId !== undefined ? JSON.stringify({ approverUserId }) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || data.success === false) {
        const msg = data.error?.message ?? "Could not submit for approval.";
        if (fromModal) setSubmitError(msg);
        else setActionError(msg);
        return;
      }
      toastSuccess("Sent for approval.");
      setSubmitForApprovalDocId(null);
      setSubmitApproverId("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmSendForApproval() {
    if (!submitForApprovalDocId) return;
    const aid = submitApproverId.trim();
    if (!aid) {
      setSubmitError("Select an org Admin or Super Admin.");
      return;
    }
    await submitForApprovalDirect(submitForApprovalDocId, aid, true);
  }

  async function onApprove(requestId: string) {
    setActionError(null);
    setBusyId(requestId);
    try {
      const { ok, message } = await postJson(`/api/approval-requests/${encodeURIComponent(requestId)}/approve`);
      if (!ok) {
        setActionError(message);
        return;
      }
      toastSuccess("SOP approved.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmReject() {
    if (!rejectRequestId) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Please enter a rejection reason.");
      return;
    }
    setRejectError(null);
    setBusyId(rejectRequestId);
    try {
      const { ok, message } = await postJson(
        `/api/approval-requests/${encodeURIComponent(rejectRequestId)}/reject`,
        { remarks: reason },
      );
      if (!ok) {
        setRejectError(message);
        return;
      }
      toastSuccess("SOP rejected.");
      setRejectRequestId(null);
      setRejectReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteSop(docId: string, title: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete SOP "${title}"? This cannot be undone.`)
    ) {
      return;
    }
    setActionError(null);
    setBusyId(`del:${docId}`);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(docId)}`, { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || data.success === false) {
        setActionError(data.error?.message ?? "Could not delete SOP.");
        return;
      }
      toastSuccess("SOP deleted.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onConfirmArchive() {
    if (!archiveForDocId) return;
    const reason = archiveReason.trim();
    if (!reason) {
      setActionError("Please enter an archive reason.");
      return;
    }
    setActionError(null);
    setBusyId(`arc:${archiveForDocId}`);
    try {
      const res = await fetch(`/api/documents/${encodeURIComponent(archiveForDocId)}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || data.success === false) {
        setActionError(data.error?.message ?? "Could not archive SOP.");
        return;
      }
      toastSuccess("SOP archived.");
      setArchiveForDocId(null);
      setArchiveReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onEscalate(docId: string, requestId: string) {
    const targetUserId = escalateTargetByDoc[docId] ?? orgAdmins[0]?.id;
    if (!targetUserId) {
      setActionError("Select an Admin to escalate to.");
      return;
    }
    setActionError(null);
    setBusyId(requestId);
    try {
      const { ok, message } = await postJson(`/api/approval-requests/${encodeURIComponent(requestId)}/escalate`, {
        targetUserId,
      });
      if (!ok) {
        setActionError(message);
        return;
      }
      toastSuccess("Sent to org Admin for approval.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function onDeptEndorse(requestId: string) {
    setActionError(null);
    setBusyId(requestId);
    try {
      const { ok, message } = await postJson(
        `/api/approval-requests/${encodeURIComponent(requestId)}/dept-endorse`,
        {},
      );
      if (!ok) {
        setActionError(message);
        return;
      }
      toastSuccess("Recorded as approved by department.");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {submitForApprovalDocId ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-approval-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 id="submit-approval-title" className="text-lg font-semibold text-slate-900">
              Send for approval
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Choose an org Admin or Super Admin. They will receive Approve and Reject actions for this SOP.
            </p>
            <label htmlFor="submit-approver-select" className="mt-4 mb-1 block text-sm font-medium text-slate-700">
              Approver (name — email)
            </label>
            <select
              id="submit-approver-select"
              value={submitApproverId}
              onChange={(e) => setSubmitApproverId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              {submitApprovers.length === 0 ? (
                <option value="">Loading approvers…</option>
              ) : (
                submitApprovers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.email}
                    {u.role === "SUPER_ADMIN" ? " (Super Admin)" : " (Admin)"}
                  </option>
                ))
              )}
            </select>
            {submitError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {submitError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSubmitForApprovalDocId(null);
                  setSubmitApproverId("");
                  setSubmitError(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId !== null || submitApprovers.length === 0 || !submitApproverId}
                onClick={() => void onConfirmSendForApproval()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busyId === submitForApprovalDocId ? "Sending…" : "Send for approval"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectRequestId ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-sop-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 id="reject-sop-title" className="text-lg font-semibold text-slate-900">
              Reject SOP
            </h2>
            <p className="mt-2 text-sm text-slate-600">A reason is required and will be stored with this decision.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Reason for rejection…"
            />
            {rejectError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {rejectError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectRequestId(null);
                  setRejectReason("");
                  setRejectError(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void onConfirmReject()}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {busyId === rejectRequestId ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {archiveForDocId ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-sop-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <h2 id="archive-sop-title" className="text-lg font-semibold text-slate-900">
              Archive SOP
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This SOP is published. Archiving removes it from active lists. Please provide a reason.
            </p>
            <textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="Reason for archiving…"
            />
            {actionError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                {actionError}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setArchiveForDocId(null);
                  setArchiveReason("");
                  setActionError(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId !== null || !archiveReason.trim()}
                onClick={() => void onConfirmArchive()}
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
              >
                {busyId?.startsWith("arc:") ? "Archiving…" : "Archive"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Documents</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{sopSectionTitle}</h2>
        </div>

      {actionError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
      ) : null}

      {showSopTabs && !forceSingleList ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {canShowTab("all") ? (
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All SOPs
            </button>
          ) : null}
          {canShowTab("pending") ? (
            <button
              type="button"
              onClick={() => setTab("pending")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "pending" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Pending approval
            </button>
          ) : null}
          {canShowTab("approved") ? (
            <button
              type="button"
              onClick={() => setTab("approved")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "approved" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Approved
            </button>
          ) : null}
          {canShowTab("archived") ? (
            <button
              type="button"
              onClick={() => setTab("archived")}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === "archived" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Archived
            </button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-600">Loading SOPs…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : sops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
          {tab === "pending"
            ? "No SOPs pending approval."
            : tab === "approved"
              ? "No approved SOPs in this view."
              : tab === "archived"
                ? "No archived SOPs in this view."
              : "No SOPs yet."}
        </div>
      ) : (() => {
        const totalItems = sops.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const pagedSops = sops.slice(startIndex, startIndex + itemsPerPage);

        return (
        <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-5 py-4">SOP Information</th>
                <th className="px-5 py-4">Identifier</th>
                <th className="px-5 py-4">Revision</th>
                <th className="px-5 py-4">Status & State</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pagedSops.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-slate-50/50 group">
                  <td className="px-5 py-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight text-[13px]">{row.title}</td>
                  <td className="px-5 py-4 text-[13px] font-medium text-slate-500 tabular-nums">{row.serialNo}</td>
                  <td className="px-5 py-4 text-[13px] font-bold text-slate-400/80">
                    {row.versionLabel?.trim() ? row.versionLabel : `v${row.currentVersion}`}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        {row.isPublished ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
                            Published
                          </span>
                        ) : null}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                          row.status === "APPROVED" 
                            ? "bg-blue-50 text-blue-700 ring-blue-200" 
                            : row.status === "PENDING_APPROVAL"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : row.status === "REJECTED"
                            ? "bg-red-50 text-red-700 ring-red-200"
                            : "bg-slate-50 text-slate-700 ring-slate-200"
                        }`}>
                          {formatStatus(row.status)}
                        </span>
                      </div>
                      {row.status === "PENDING_APPROVAL" && row.deptEndorsed ? (
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Ready for org Admin
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end gap-2">
                      {row.canSubmitForApproval ? (
                        <button
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => openSendForApproval(row.id)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          {busyId === row.id ? "…" : "Send for approval"}
                        </button>
                      ) : null}
                      {row.pendingApprovalRequestId &&
                      (row.canActAsApprover ||
                        row.canRejectAsApprover ||
                        row.canEscalateToAdmin ||
                        row.canDeptEndorseSop) ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {row.canDeptEndorseSop ? (
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => void onDeptEndorse(row.pendingApprovalRequestId!)}
                              className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Approved by department
                            </button>
                          ) : null}
                          {row.canActAsApprover ? (
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => void onApprove(row.pendingApprovalRequestId!)}
                              className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          ) : null}
                          {row.canRejectAsApprover ? (
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => {
                                setRejectRequestId(row.pendingApprovalRequestId!);
                                setRejectReason("");
                                setRejectError(null);
                              }}
                              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          ) : null}
                          {row.canEscalateToAdmin ? (
                            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1 ring-1 ring-slate-200">
                              <select
                                value={escalateTargetByDoc[row.id] ?? orgAdmins[0]?.id ?? ""}
                                onChange={(e) =>
                                  setEscalateTargetByDoc((prev) => ({ ...prev, [row.id]: e.target.value }))
                                }
                                className="bg-transparent pl-2 pr-1 py-1 text-[11px] font-bold text-slate-600 outline-none"
                              >
                                {orgAdmins.length === 0 ? (
                                  <option value="">No Admins</option>
                                ) : (
                                  orgAdmins.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name.split(" ")[0]}
                                    </option>
                                  ))
                                )}
                              </select>
                              <button
                                type="button"
                                disabled={busyId !== null || orgAdmins.length === 0}
                                onClick={() => void onEscalate(row.id, row.pendingApprovalRequestId!)}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                              >
                                Escalate
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
                        {tab === "archived" || row.status === "ARCHIVED" ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => setArchiveReasonFor(row)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                            >
                              Reason
                            </button>
                            <button
                              type="button"
                              disabled={busyId !== null}
                              onClick={() => void onUnarchive(row.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 shadow-sm transition-all hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Unarchive
                            </button>
                          </>
                        ) : null}
                        {row.fileKind?.toUpperCase?.() === "VIDEO" ? (
                          <DownloadLink
                            href={`/api/documents/${encodeURIComponent(row.id)}/download-original`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            Video
                          </DownloadLink>
                        ) : row.canDownloadPdf ? (
                          <DownloadLink
                            href={`/api/documents/${encodeURIComponent(row.id)}/download-pdf`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            PDF
                          </DownloadLink>
                        ) : null}
                        {tab !== "archived" && row.status !== "ARCHIVED" && row.canDeleteUnpublished ? (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            title="Delete SOP"
                            onClick={() => void onDeleteSop(row.id, row.title)}
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600 hover:scale-105 disabled:opacity-50"
                          >
                            <span className="sr-only">Delete</span>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        ) : null}
                        {row.canArchivePublished ? (
                          <button
                            type="button"
                            disabled={busyId !== null}
                            title="Archive SOP"
                            onClick={() => {
                              setArchiveForDocId(row.id);
                              setArchiveReason("");
                              setActionError(null);
                            }}
                            className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600 hover:scale-105 disabled:opacity-50"
                          >
                            <span className="sr-only">Archive</span>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-white px-4 py-3 sm:px-6 rounded-b-xl border border-slate-200">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of{" "}
                  <span className="font-medium">{totalItems}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-slate-300 focus:z-20 focus:outline-offset-0 ${
                        currentPage === i + 1
                          ? "z-10 bg-slate-900 text-white"
                          : "text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5-4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
        </div>
        );
      })()}

      </div>

      {policies != null ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Documents</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{policiesTitle}</h2>
          </div>
          {policies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-600">
              No policies mapped to this sub-department.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Serial No</th>
                    <th className="px-4 py-3">Version</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {policies.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.title}</td>
                      <td className="px-4 py-3 text-slate-600">{item.serialNo}</td>
                      <td className="px-4 py-3 text-slate-600">v{item.currentVersion}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatStatus(item.status)}
                        {item.isPublished ? " • Published" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {archiveReasonFor && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Archive Reason</h2>
                <p className="mt-1 text-sm text-slate-500">{archiveReasonFor.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setArchiveReasonFor(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {archiveReasonFor.archiveReason?.trim() || "No reason recorded."}
                </p>
              </div>
              {archiveReasonFor.archivedAt ? (
                <p className="text-xs text-slate-500">
                  Archived on {new Date(archiveReasonFor.archivedAt).toLocaleString()}
                </p>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setArchiveReasonFor(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
