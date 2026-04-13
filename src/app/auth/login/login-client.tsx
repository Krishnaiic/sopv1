"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY;

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_config: "Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.",
  google_denied: "Google sign-in was cancelled.",
  google_no_code: "Google sign-in did not complete. Try again.",
  google_token: "Could not verify Google sign-in. Try again.",
  google_profile: "Could not load your Google profile.",
  domain_not_allowed: "Only @iiclakshya.com Google accounts are allowed.",
  email_not_verified: "Your Google email must be verified.",
  inactive: "This account is disabled.",
};

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

async function executeRecaptcha(action: string): Promise<string | null> {
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

export function UserLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next") || "/departments";
  const googleErrCode = searchParams.get("error");

  const [mode, setMode] = useState<"choose" | "otp">("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otpPhase, setOtpPhase] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(() =>
    googleErrCode && GOOGLE_ERROR_MESSAGES[googleErrCode]
      ? GOOGLE_ERROR_MESSAGES[googleErrCode]
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (cooldownSec <= 0) return undefined;
    const id = window.setTimeout(() => setCooldownSec((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownSec]);

  const startCooldown = useCallback((seconds: number) => {
    setCooldownSec(Math.max(0, Math.ceil(seconds)));
  }, []);

  async function sendOtp() {
    setError(null);
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("otp_send");
      if (!recaptchaToken && process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY) {
        setError("reCAPTCHA failed");
        return;
      }
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), recaptchaToken: recaptchaToken ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || data.success !== true) {
        const msg = data.error?.message || "Could not send code.";
        setError(msg);
        if (res.status === 429) startCooldown(5);
        return;
      }
      setOtpPhase("code");
      setCode("");
      startCooldown(5);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha("otp_verify");
      if (!recaptchaToken && process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY) {
        setError("reCAPTCHA failed");
        return;
      }
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          recaptchaToken: recaptchaToken ?? undefined,
          next: nextParam,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as
        | { success: true; data: { redirectTo: string } }
        | { success: false; error?: { message?: string } };
      if (!res.ok || data.success !== true) {
        setError((data as { success: false; error?: { message?: string } }).error?.message || "Invalid code.");
        return;
      }
      router.push(data.data.redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const googleHref = `/api/auth/google?next=${encodeURIComponent(nextParam)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#f5f7fb_0%,#edf2f7_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-[940px] items-stretch overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.10)] lg:grid-cols-[0.94fr_1.06fr]">
        <div className="hidden border-r border-slate-200 bg-white lg:flex lg:items-center lg:justify-center lg:p-5">
          <div className="relative aspect-[5/4] w-full max-w-[380px] overflow-hidden rounded-[18px] bg-white">
            <Image
              src="/sop.jpg"
              alt="SOP"
              fill
              priority
              className="object-cover object-center"
              sizes="(min-width: 1024px) 38vw, 100vw"
            />
          </div>
        </div>

        <div className="flex items-center justify-center px-6 py-7 sm:px-10 lg:px-12">
          <div className="w-full max-w-[390px]">
            <div className="mb-7 space-y-3 border-b border-slate-200 pb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">User Access</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Sign in</h1>
              <p className="text-sm leading-6 text-slate-600">
                Use your <span className="font-medium">@iiclakshya.com</span> account — email code or Google.
              </p>
            </div>

            {mode === "choose" ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setMode("otp");
                    setOtpPhase("email");
                    setError(null);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left text-sm font-semibold text-slate-900 shadow-sm transition hover:border-sky-300 hover:bg-slate-50"
                >
                  Continue with email OTP
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    We&apos;ll email you a one-time code
                  </span>
                </button>

                <a
                  href={googleHref}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </a>

                <p className="pt-2 text-center text-xs text-slate-500">
                  Restricted to <span className="font-medium">@iiclakshya.com</span> emails.
                </p>
              </div>
            ) : otpPhase === "email" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendOtp();
                }}
                className="space-y-5"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMode("choose");
                    setError(null);
                  }}
                  className="text-xs font-medium text-sky-700 hover:text-sky-800"
                >
                  ← Back
                </button>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Work email</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@iiclakshya.com"
                    autoComplete="email"
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
                  className="w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending…" : "Send code"}
                </button>
              </form>
            ) : (
              <form onSubmit={verifyOtp} className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setOtpPhase("email");
                    setCode("");
                    setError(null);
                  }}
                  className="text-xs font-medium text-sky-700 hover:text-sky-800"
                >
                  ← Change email
                </button>

                <p className="text-sm text-slate-600">
                  Enter the 6-digit code sent to <span className="font-medium text-slate-900">{email}</span>
                </p>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">One-time code</label>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="\d{6}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
                  disabled={loading || code.length !== 6}
                  className="w-full rounded-xl bg-sky-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Signing in…" : "Verify & sign in"}
                </button>

                <div className="flex items-center justify-center">
                  {cooldownSec > 0 ? (
                    <p className="text-xs font-medium text-slate-500 tabular-nums">
                      Resend code in{" "}
                      <span className="text-sky-700">{cooldownSec}</span>s
                    </p>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void sendOtp()}
                      className="text-xs font-semibold text-sky-700 hover:text-sky-800 disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
