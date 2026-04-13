"use client";

import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const token = await executeRecaptcha("forgot_password");
      if (!token) {
        setMessage("reCAPTCHA failed.");
        return;
      }
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, recaptchaToken: token }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { success: true }
        | { success: false; error: { message: string } };
      if (!res.ok || data.success === false) {
        setMessage("Unable to send reset link.");
        return;
      }
      setMessage("If this email exists, password reset instructions were sent.");
      setTimeout(() => router.push("/auth/login"), 1200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-[520px] rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-[0_18px_48px_rgba(15,23,42,0.10)] sm:px-10 sm:py-9">
        <div className="mb-7 space-y-3 border-b border-slate-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            User Access
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Forgot your password?
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            Enter your registered email address and we&apos;ll send password reset instructions.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              required
            />
          </div>

          {message ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>Remembered your password?</span>
          <Link
            href="/auth/login"
            className="font-medium text-sky-700 transition hover:text-sky-800"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
