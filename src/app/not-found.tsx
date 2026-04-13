import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-[#0d1635]"
      style={{ fontFamily: '"Canva Sans", var(--font-manrope), sans-serif' }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0)_48%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-white/80 blur-3xl"
      />

      <section className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-14 sm:px-6 lg:px-10">
        <div className="relative mx-auto w-full max-w-2xl rounded-[1.75rem] border border-slate-200/80 bg-white px-6 py-12 text-center shadow-[0_24px_60px_rgba(13,22,53,0.08)] sm:px-10 sm:py-14 lg:px-14 lg:py-16">
          <div className="mx-auto max-w-2xl">
            <p className="text-7xl font-extrabold tracking-[-0.08em] text-[#115b95] sm:text-8xl">
              404
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.05em] text-[#0d1635] sm:text-5xl">
              Page not found
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-[1.05rem]">
              The page you are trying to open does not exist, may have moved, or the link may be outdated.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="inline-flex min-w-40 items-center justify-center rounded-xl border border-[#d6ad45] bg-[#d6ad45] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0d1635] transition duration-200 hover:bg-[#e0b650]"
              >
                Go to Home
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex min-w-40 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#0d1635] transition duration-200 hover:bg-slate-50"
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
