import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/apiResponse";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/enums";
import { requiredEmailDomain, verifyRecaptcha } from "@/lib/recaptcha";
import { sendTransactionalEmail } from "@/lib/email";
import { otpSendBodySchema } from "@/validators/authValidators";
import { generateSixDigitOtp, hashEmailOtp } from "@/lib/login-otp";

const RESEND_COOLDOWN_MS = 5_000;

function recaptchaRequired(): boolean {
  return Boolean(process.env.GOOGLE_RECAPTCHA_SECRET_KEY?.trim());
}

export async function POST(req: Request) {
  const parsed = otpSendBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid email"), { status: 400 });
  }

  const { email, recaptchaToken } = parsed.data;
  const lower = email.trim().toLowerCase();

  if (!requiredEmailDomain(lower)) {
    return NextResponse.json(
      fail("INVALID_EMAIL_DOMAIN", "Only @iiclakshya.com accounts can sign in."),
      { status: 400 },
    );
  }

  if (recaptchaRequired()) {
    if (!recaptchaToken?.trim()) {
      return NextResponse.json(fail("RECAPTCHA_REQUIRED", "Complete the security check and try again."), {
        status: 400,
      });
    }
    const recaptcha = await verifyRecaptcha(recaptchaToken, "otp_send");
    if (!recaptcha.success) {
      return NextResponse.json(fail("RECAPTCHA_FAILED", "reCAPTCHA failed"), { status: 400 });
    }
  }

  const now = new Date();
  const existing = await prisma.emailLoginOtp.findUnique({
    where: { email: lower },
  });

  if (existing && now.getTime() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil(
      (RESEND_COOLDOWN_MS - (now.getTime() - existing.lastSentAt.getTime())) / 1000,
    );
    return NextResponse.json(
      fail("RATE_LIMIT", `Wait ${waitSec}s before requesting another code.`),
      { status: 429 },
    );
  }

  const code = generateSixDigitOtp();
  const codeHash = hashEmailOtp(lower, code);
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

  await prisma.emailLoginOtp.upsert({
    where: { email: lower },
    create: {
      email: lower,
      codeHash,
      expiresAt,
      lastSentAt: now,
      attempts: 0,
    },
    update: {
      codeHash,
      expiresAt,
      lastSentAt: now,
      attempts: 0,
    },
  });

  const sent = await sendTransactionalEmail({
    to: lower,
    subject: "Your Lakshya SOP portal sign-in code",
    text: `Your one-time code is: ${code}\n\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });

  if (!sent.ok) {
    await prisma.emailLoginOtp.deleteMany({ where: { email: lower } });
    await writeAuditLog({
      actorId: null,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: lower,
      meta: { outcome: "DENY", reason: "OTP_EMAIL_FAILED", error: sent.error },
      req,
    });
    return NextResponse.json(fail("EMAIL_FAILED", "Could not send email. Check SMTP configuration."), {
      status: 503,
    });
  }

  await writeAuditLog({
    actorId: null,
    action: AuditAction.LOGIN,
    entityType: "Auth",
    entityId: lower,
    meta: { outcome: "OTP_SENT" },
    req,
  });

  return NextResponse.json(ok({ sent: true }), { status: 200 });
}
