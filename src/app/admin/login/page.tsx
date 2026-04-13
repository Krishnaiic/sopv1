"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY;

function loadRecaptcha(siteKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("browser only"));
    if (window.grecaptcha) return resolve();
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("failed to load recaptcha"));
    document.head.appendChild(script);
  });
}

async function executeRecaptcha(action: string) {
  if (!RECAPTCHA_SITE_KEY) return null;
  await loadRecaptcha(RECAPTCHA_SITE_KEY);
  const grecaptcha = window.grecaptcha;
  if (!grecaptcha) return null;
  return await new Promise<string | null>((resolve) => {
    grecaptcha.ready(() => {
      grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(() => resolve(null));
    });
  });
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("login");
      if (!recaptchaToken) {
        setError("reCAPTCHA failed");
        return;
      }
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { success: true; data: { redirectTo: string } }
        | { success: false; error: { code?: string; message: string } };
      if (!res.ok || data.success === false) {
        const msg =
          data.success === false && data.error?.message
            ? data.error.message
            : "Invalid admin credentials";
        setError(msg);
        return;
      }
      router.push(data.data.redirectTo ?? "/admin");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-[960px] items-stretch overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_54px_rgba(15,23,42,0.12)] lg:grid-cols-[1.02fr_0.98fr]">
        <div className="relative hidden min-h-full overflow-hidden bg-slate-950 lg:block">
          <Image
            src="/admin.jpg"
            alt="Admin workspace"
            fill
            priority
            className="object-cover object-center"
            sizes="(min-width: 1024px) 44vw, 100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.74)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <div className="max-w-sm rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                Admin Portal
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                Secure control for operational teams
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Access administration tools, approvals, departments, and oversight workflows from one place.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-7 sm:px-10 lg:px-12">
          <div className="w-full max-w-[390px]">
            <div className="mb-7 space-y-3 border-b border-slate-200 pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Admin Access
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                Sign in to admin panel
              </h1>
              <p className="text-sm leading-6 text-slate-600">
                For Super Admin, Admin, Department Admin, and Supervisor roles. Employees should use the user login.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

