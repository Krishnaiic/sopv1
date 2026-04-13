"use client";

import Link from "next/link";
import { SopPdfLikePreview } from "@/components/sop-pdf-like-preview";

type Props = {
  documentId: string;
  title: string;
  /** Shown in top bar alongside A4 preview (version is also on page 1 of the preview). */
  versionLabel: string;
  effectiveDate: string;
  departmentLabel: string;
};

export function SopPublicView({
  documentId,
  title,
  versionLabel,
  effectiveDate,
  departmentLabel,
}: Props) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#eef1fb] text-[#0d1635]">
      <section className="border-b border-slate-200/70 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-10">
          <div>
            <p className="text-lg font-extrabold tracking-[-0.04em] text-[#0d1635]">Lakshya</p>
            <p className="mt-1 text-sm text-slate-500">SOP viewer</p>
            <h1 className="mt-3 text-xl font-bold tracking-tight text-[#0d1635] sm:text-2xl">{title}</h1>
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Version:</span> {versionLabel}
              <span className="mx-2 text-slate-300">|</span>
              <span className="font-semibold text-slate-800">Effective:</span> {effectiveDate || "—"}
              <span className="mx-2 text-slate-300">|</span>
              {departmentLabel}
            </p>
          </div>

          <Link
            href="/departments"
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-[#0d1635] transition hover:bg-slate-50"
          >
            Back to Departments
          </Link>
        </div>
      </section>

      <section className="mx-auto w-screen max-w-[100vw] px-4 py-10 sm:px-6 md:w-3/4 md:max-w-[75vw] lg:px-10">
        <SopPdfLikePreview documentId={documentId} previewApi="sops" />
      </section>
    </main>
  );
}
