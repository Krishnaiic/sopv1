import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/apiResponse";
import { setAuthSessionCookie } from "@/lib/auth-cookie";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction, Role } from "@/generated/prisma/enums";
import { requiredEmailDomain, verifyRecaptcha } from "@/lib/recaptcha";
import { otpVerifyBodySchema } from "@/validators/authValidators";
import { verifyEmailOtp } from "@/lib/login-otp";
import { safeNextPath } from "@/lib/auth-redirect";

const MAX_OTP_ATTEMPTS = 8;

function recaptchaRequired(): boolean {
  return Boolean(process.env.GOOGLE_RECAPTCHA_SECRET_KEY?.trim());
}

function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "User";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

export async function POST(req: Request) {
  const parsed = otpVerifyBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid request"), { status: 400 });
  }

  const { email, code, recaptchaToken, next: nextRaw } = parsed.data;
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
    const recaptcha = await verifyRecaptcha(recaptchaToken, "otp_verify");
    if (!recaptcha.success) {
      return NextResponse.json(fail("RECAPTCHA_FAILED", "reCAPTCHA failed"), { status: 400 });
    }
  }

  const row = await prisma.emailLoginOtp.findUnique({ where: { email: lower } });
  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json(fail("INVALID_CODE", "Code expired or not found. Request a new one."), { status: 400 });
  }

  if (row.attempts >= MAX_OTP_ATTEMPTS) {
    await prisma.emailLoginOtp.delete({ where: { email: lower } });
    return NextResponse.json(fail("INVALID_CODE", "Too many attempts. Request a new code."), { status: 400 });
  }

  const valid = verifyEmailOtp(lower, code, row.codeHash);
  if (!valid) {
    await prisma.emailLoginOtp.update({
      where: { email: lower },
      data: { attempts: { increment: 1 } },
    });
    await writeAuditLog({
      actorId: null,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: lower,
      meta: { outcome: "DENY", reason: "BAD_OTP" },
      req,
    });
    return NextResponse.json(fail("INVALID_CODE", "Invalid code."), { status: 401 });
  }

  await prisma.emailLoginOtp.delete({ where: { email: lower } });

  let user = await prisma.user.findUnique({
    where: { email: lower },
    select: {
      id: true,
      role: true,
      isActive: true,
      departmentId: true,
      subDepartmentId: true,
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: lower,
        name: displayNameFromEmail(lower),
        passwordHash: null,
        role: Role.EMPLOYEE,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
        departmentId: true,
        subDepartmentId: true,
      },
    });
  }

  if (!user.isActive) {
    await writeAuditLog({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: user.id,
      meta: { outcome: "DENY", reason: "INACTIVE" },
      req,
    });
    return NextResponse.json(fail("FORBIDDEN", "Account is disabled."), { status: 403 });
  }

  await setAuthSessionCookie({
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
    subDepartmentId: user.subDepartmentId,
  });

  // User portal (/auth/login): never send to /admin — admins use /admin/login for that.
  const redirectTo = safeNextPath(nextRaw);

  await writeAuditLog({
    actorId: user.id,
    action: AuditAction.LOGIN,
    entityType: "Auth",
    entityId: user.id,
    meta: { outcome: "ALLOW", role: user.role, via: "OTP" },
    req,
  });

  return NextResponse.json(ok({ redirectTo }), { status: 200 });
}
