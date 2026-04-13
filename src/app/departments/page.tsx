import Image from "next/image";
import Link from "next/link";
import { getPublicDepartmentSummaries, getPublicSopSummaries } from "@/lib/public-departments";
import { requireViewerUser } from "@/lib/viewer-access";
import { LogoutButton } from "@/components/logout-button";

type DepartmentsPageProps = {
  searchParams?: Promise<{
    department?: string;
    sop?: string;
  }>;
};

export default async function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  await requireViewerUser();

  const params = (await searchParams) ?? {};
  const selectedDepartmentId = typeof params.department === "string" ? params.department : "";
  const sopSearch = typeof params.sop === "string" ? params.sop.trim() : "";

  const [departments, sops] = await Promise.all([getPublicDepartmentSummaries(), getPublicSopSummaries()]);

  const visibleDepartments = selectedDepartmentId
    ? departments.filter((department) => department.id === selectedDepartmentId)
    : departments;

  const visibleSops = sops.filter((sop) => {
    if (selectedDepartmentId && sop.departmentId !== selectedDepartmentId) return false;
    if (sopSearch && !sop.title.toLowerCase().includes(sopSearch.toLowerCase())) return false;
    return true;
  });

  const selectedDepartmentName =
    departments.find((department) => department.id === selectedDepartmentId)?.name ?? "All departments";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,rgba(219,234,254,0)_28%),radial-gradient(circle_at_top_right,#e0f2fe_0%,rgba(224,242,254,0)_24%),linear-gradient(180deg,#f8fbff_0%,#eef3fb_55%,#f6f8fc_100%)] text-[#0d1635]">
      <section className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-5 sm:px-6 md:flex-row md:items-center lg:px-10">
          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <Image
                src="/BLUE.png"
                alt="Lakshya logo"
                width={64}
                height={64}
                unoptimized
                className="block h-14 w-auto object-contain sm:h-16"
                priority
              />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-[-0.04em] text-[#0d1635]">Lakshya</p>
              <p className="mt-1 text-sm text-slate-500">Departments and SOP coverage</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#0d1635] shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
              <span aria-hidden="true">←</span>
              Back to Home
            </Link>
            <LogoutButton
              withIcon
              className="inline-flex items-center rounded-xl border border-red-500/80 bg-[linear-gradient(135deg,#ef4444,#dc2626)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(220,38,38,0.22)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(220,38,38,0.28)]"
              label="Logout"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-10">
        <div className="relative overflow-hidden rounded-[36px] border border-white/70 bg-[linear-gradient(135deg,rgba(13,22,53,0.98),rgba(17,91,149,0.94)_48%,rgba(15,118,110,0.9))] px-6 py-8 text-white shadow-[0_30px_80px_rgba(13,22,53,0.18)] sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(148,163,184,0.14),transparent_30%)]" />
          <div className="absolute -right-16 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-sky-100/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                Departments
              </div>
              <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
                SOP Directory Dashboard
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-sky-50/85 sm:text-base">
                Browse departments, narrow results with filters, and open published SOPs through a cleaner,
                easier-to-scan workspace designed like a modern internal SaaS dashboard.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-[26px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/14">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">Departments</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-white">{visibleDepartments.length}</p>
                  <p className="mt-1 text-sm text-sky-50/75">Visible in current view</p>
                </div>
                <div className="rounded-[26px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/14">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">Published SOPs</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-white">{visibleSops.length}</p>
                  <p className="mt-1 text-sm text-sky-50/75">Matching your current filters</p>
                </div>
                <div className="rounded-[26px] border border-white/12 bg-white/10 px-5 py-4 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/14">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">Active scope</p>
                  <p className="mt-3 truncate text-lg font-semibold text-white">{selectedDepartmentName}</p>
                  <p className="mt-1 text-sm text-sky-50/75">{sopSearch ? `Search: ${sopSearch}` : "No SOP keyword filter"}</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[640px]">
              <div className="absolute -inset-4 rounded-[34px] bg-white/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/16 bg-white/10 p-3 shadow-[0_24px_60px_rgba(2,6,23,0.24)] backdrop-blur-md">
                <div className="relative aspect-[16/11] overflow-hidden rounded-[26px]">
                  <Image
                    src="/sopdashboard.jpg"
                    alt="SOP dashboard illustration"
                    fill
                    priority
                    unoptimized
                    className="object-cover object-center transition duration-700 hover:scale-[1.02]"
                    sizes="(min-width: 1024px) 42vw, 100vw"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.02),rgba(2,6,23,0.22))]" />
                  <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-white/16 bg-slate-950/28 px-4 py-4 backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/80">Operational overview</p>
                    <p className="mt-2 text-sm leading-6 text-white/88">
                      Explore structured departments, refine views instantly, and access published SOPs in one polished workspace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-10">
          <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_60px_rgba(13,22,53,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b58e39]">Filters</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#0d1635]">Refine your directory view</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Filter by department and SOP title without changing the current data flow or navigation.
                </p>
              </div>
              <div className="inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                Search and filter
              </div>
            </div>

            <form className="mt-8">
              <div className="grid gap-5 xl:grid-cols-[1fr_1fr_auto]">
                <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                  <label htmlFor="department" className="mb-2 block text-sm font-semibold text-slate-700">
                    Department
                  </label>
                  <div className="relative">
                    <select
                      id="department"
                      name="department"
                      defaultValue={selectedDepartmentId}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-11 text-sm text-slate-700 outline-none transition duration-300 hover:border-slate-300 focus:border-[#115b95] focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">All departments</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                      ▾
                    </span>
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] p-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                  <label htmlFor="sop" className="mb-2 block text-sm font-semibold text-slate-700">
                    SOP Name
                  </label>
                  <input
                    id="sop"
                    name="sop"
                    type="search"
                    defaultValue={sopSearch}
                    placeholder="Search SOP name"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-700 outline-none transition duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-[#115b95] focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                <div className="flex flex-col justify-end gap-3 sm:flex-row xl:flex-col">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0d1635,#115b95)] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(17,91,149,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_36px_rgba(17,91,149,0.3)]"
                  >
                    Apply
                  </button>
                  <Link
                    href="/departments"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
                  >
                    Reset
                  </Link>
                </div>
              </div>
            </form>
          </section>

          {visibleDepartments.length === 0 ? (
            <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/85 px-6 py-12 text-center text-slate-500 shadow-[0_18px_45px_rgba(13,22,53,0.05)] backdrop-blur">
              No departments match the selected filter.
            </section>
          ) : (
            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#b58e39]">Departments</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#0d1635]">Browse by department</h2>
                </div>
                <p className="text-sm text-slate-500">{visibleDepartments.length} card(s)</p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visibleDepartments.map((department) => (
                  <Link
                    key={department.id}
                    href={`/departments/${encodeURIComponent(department.id)}`}
                    className="group relative overflow-hidden rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,#ffffff,#f8fbff)] px-7 py-7 shadow-[0_18px_45px_rgba(13,22,53,0.07)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_rgba(17,91,149,0.16)]"
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#115b95,#38bdf8,#14b8a6)] opacity-70 transition duration-300 group-hover:opacity-100" />
                    <div className="absolute -right-10 top-6 h-28 w-28 rounded-full bg-sky-100/70 blur-2xl transition duration-300 group-hover:bg-sky-200/80" />

                    <div className="relative flex h-full flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {department.code?.trim() || "Department"}
                          </p>
                          <h3 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-[#0d1635] transition duration-300 group-hover:text-[#115b95]">
                            {department.name}
                          </h3>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50 text-[#115b95] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition duration-300 group-hover:scale-105 group-hover:bg-white">
                          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 19.5V8.8c0-.5.2-1 .7-1.3l6.5-3.6c.5-.3 1.1-.3 1.6 0l6.5 3.6c.4.3.7.8.7 1.3v10.7" />
                            <path d="M3 20h18" />
                            <path d="M8 20v-6h3v6" />
                            <path d="M13 20v-6h3v6" />
                            <path d="M8 10h.01" />
                            <path d="M16 10h.01" />
                          </svg>
                        </div>
                      </div>

                      <div className="mt-8 flex items-end justify-between gap-4">
                        <p className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                          {department.sopCount} {department.sopCount === 1 ? "SOP" : "SOPs"}
                        </p>
                        <p className="text-sm font-semibold text-[#115b95] transition duration-300 group-hover:translate-x-1">
                          View sub-departments →
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_22px_60px_rgba(13,22,53,0.08)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#b58e39]">Published SOPs</p>
                <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-[#0d1635] sm:text-4xl">SOP Directory</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Open published SOPs directly, or use the filters above to narrow the list before navigating.
                </p>
              </div>
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-600">
                {visibleSops.length} result(s)
              </div>
            </div>

            {visibleSops.length === 0 ? (
              <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center text-slate-500">
                No published SOPs match the selected department or SOP name.
              </div>
            ) : (
              <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(13,22,53,0.06)]">
                <div className="hidden grid-cols-[1.2fr_0.8fr] border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc,#f1f5f9)] px-6 py-4 text-sm font-semibold text-slate-600 md:grid">
                  <p>SOP Name</p>
                  <p>Department</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {visibleSops.map((sop) => (
                    <div
                      key={sop.id}
                      className="grid gap-3 px-5 py-5 text-sm text-slate-700 transition duration-300 hover:bg-sky-50/40 md:grid-cols-[1.2fr_0.8fr] md:px-6"
                    >
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                          SOP Name
                        </p>
                        <Link
                          href={`/sops/${encodeURIComponent(sop.id)}`}
                          className="font-semibold text-slate-900 transition duration-300 hover:text-[#115b95]"
                        >
                          {sop.title}
                        </Link>
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:hidden">
                          Department
                        </p>
                        <p>{sop.departmentName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
