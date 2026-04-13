"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DepartmentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [departmentName, setDepartmentName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json() as Promise<{ success?: boolean; data?: { user?: { role?: string; departmentId?: string | null; subDepartmentId?: string | null } } }>)
      .then((me) => {
        if (cancelled || !me.success || !me.data?.user) return;
        const u = me.data.user;
        if (u.role === "SUPERVISOR" && u.departmentId === id && u.subDepartmentId) {
          router.replace(`/admin/departments/${u.departmentId}/subdepartments/${u.subDepartmentId}`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/departments")
      .then((r) => r.json())
      .then((data: { success?: boolean; data?: { departments?: { id: string; name: string }[] } }) => {
        if (cancelled || !data.success || !data.data?.departments) return;
        const dept = data.data.departments.find((d) => d.id === id);
        if (dept) setDepartmentName(dept.name);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  return (
    <div className="space-y-8 px-1 py-6">
      {/* Integrated Header */}
      <div className="relative border-b border-slate-100 pb-8">
        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-bold uppercase tracking-[0.2em] no-scrollbar">
          <Link href="/admin/departments" className="text-blue-600 transition-colors hover:text-blue-800">
            Departments
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{departmentName || "…"}</span>
        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-start sm:gap-12">
          <div className="space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                </svg>
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
                {departmentName || "…"}
              </h1>
            </div>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-500 mt-2">
              Explore and manage the organizational hierarchy, SOP library, and policy documentation.
            </p>
          </div>

          <Link
            href={`/admin/departments/${id}/subdepartments`}
            className="group inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 transition-all hover:border-slate-400 hover:shadow-sm sm:mt-1.5"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors shadow-sm ring-1 ring-slate-100/50">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <span className="text-[13px] font-black uppercase tracking-wider text-slate-900">Sub-departments</span>
          </Link>
        </div>
      </div>

      {/* Modern Quick Access Grid (Documents) */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href={`/admin/departments/${id}/sop`}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
        >
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">SOP Library</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Access the standard operating procedures, track approvals, and manage document versions for this department.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>Explore Library</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </div>
        </Link>

        <Link
          href={`/admin/departments/${id}/policy`}
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5"
        >
          <div className="relative z-10">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Policies</h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
              Review institutional policies and compliance guidelines mapped to the {departmentName || "department"} level.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <span>View Policies</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
