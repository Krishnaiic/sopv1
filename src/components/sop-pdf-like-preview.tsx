"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { SOP_PDF_LOGO_URL, SOP_PDF_WEB_PREVIEW_STYLES } from "@/lib/sop-pdf-document-shared";
import {
  defaultA4ContentLimitsPx,
  paginateBodyHtmlToPages,
} from "@/lib/sop-a4-preview-pagination";

type PreviewData = {
  title: string;
  version: string;
  effectiveDate: string;
  departmentLabel: string;
  bodyHtml: string;
};

type Props = {
  documentId: string;
  versionId?: string | null;
  /** Default: admin `/api/documents/.../sop-pdf-preview`. Use `sops` for `/sops/.../pdf-preview` (employee viewer). */
  previewApi?: "documents" | "sops";
};

export function SopPdfLikePreview({ documentId, versionId, previewApi = "documents" }: Props) {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pageSlices, setPageSlices] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setData(null);
    setPageSlices(null);

    const qs =
      previewApi === "documents" && versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
    const base =
      previewApi === "sops"
        ? `/api/sops/${encodeURIComponent(documentId)}/pdf-preview`
        : `/api/documents/${encodeURIComponent(documentId)}/sop-pdf-preview`;
    void (async () => {
      try {
        const res = await fetch(`${base}${qs}`);
        const json = (await res.json().catch(() => ({}))) as
          | { success?: boolean; data?: PreviewData; error?: { message?: string } }
          | Record<string, unknown>;

        if (cancelled) return;
        if (!res.ok || (json as { success?: boolean }).success === false) {
          setErr((json as { error?: { message?: string } }).error?.message ?? "Failed to load preview.");
          setLoading(false);
          return;
        }
        const payload = (json as { data?: PreviewData }).data;
        if (!payload) {
          setErr("Invalid preview response.");
          setLoading(false);
          return;
        }
        setData(payload);
      } catch {
        if (!cancelled) setErr("Failed to load preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documentId, versionId, previewApi]);

  useLayoutEffect(() => {
    if (!data?.bodyHtml) {
      setPageSlices(null);
      return;
    }
    const limits = defaultA4ContentLimitsPx();
    let slices = paginateBodyHtmlToPages(data.bodyHtml, {
      firstPageContentMaxPx: limits.first,
      otherPageContentMaxPx: limits.rest,
    });
    if (slices.length === 0) {
      slices = [data.bodyHtml];
    }
    setPageSlices(slices);
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-16 text-center text-sm text-slate-600">
        Loading PDF-style preview…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
    );
  }

  if (!data) return null;

  if (!pageSlices) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-6 py-10 text-center text-sm text-slate-600">
        Laying out A4 pages…
      </div>
    );
  }

  const totalPages = pageSlices.length;

  return (
    <div className="sop-pdf-web-preview-root w-full max-w-full overflow-x-auto rounded-2xl border border-slate-200 bg-slate-200/90">
      <style>{SOP_PDF_WEB_PREVIEW_STYLES}</style>
      {pageSlices.map((html, index) => (
        <section key={index} className="sop-a4-sheet" aria-label={`Page ${index + 1} of ${totalPages}`}>
          <div className="sop-a4-watermark" aria-hidden>
            Lakshya
          </div>
          <div className="sop-a4-sheet-inner">
            <div className="sop-pdf-preview-logo-row">
              <img src={SOP_PDF_LOGO_URL} alt="" />
            </div>
            {index === 0 ? (
              <header className="sop-a4-doc-header">
                <h1>{data.title}</h1>
                <div className="meta">
                  Version: {data.version} | Effective date: {data.effectiveDate || "-"} | Department:{" "}
                  {data.departmentLabel}
                </div>
              </header>
            ) : null}
            <main className="content" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="sop-a4-page-footer">
              {index + 1} / {totalPages}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
