"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { SopDocumentsSection } from "@/components/admin/sop-documents-section";

export default function DepartmentSopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: departmentId } = use(params);
  const [deptName, setDeptName] = useState<string>("");

  const onLoaded = useCallback(
    (meta: { department?: { name: string } }) => {
      if (meta.department?.name) setDeptName(meta.department.name);
    },
    [],
  );

  return (
    <div className="space-y-6 px-1 py-4">
      <div className="relative">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-bold uppercase tracking-[0.2em] no-scrollbar">
          <Link href="/admin/departments" className="text-blue-600 transition-colors hover:text-blue-800">
            Departments
          </Link>
          <span className="text-slate-300">/</span>
          <Link href={`/admin/departments/${departmentId}`} className="text-blue-600 transition-colors hover:text-blue-800">
            {deptName || "…"}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">SOP LIBRARY</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100/50">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {deptName || "Department"} <span className="text-blue-600">SOPs</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      <SopDocumentsSection
        listUrl={`/api/departments/${encodeURIComponent(departmentId)}/sops`}
        sopSectionTitle="Department SOPs"
        onLoaded={onLoaded}
        forceSingleList={false}
        enabledTabs={["all", "archived"]}
        itemsPerPage={10}
      />
    </div>
  );
}
