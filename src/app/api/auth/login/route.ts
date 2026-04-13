import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { requiredEmailDomain, verifyRecaptcha } from "@/lib/recaptcha";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/apiResponse";
import { safeNextPath } from "@/lib/auth-redirect";
import { loginBodySchema } from "@/validators/authValidators";

export async function POST(req: Request) {
  const parsed = loginBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    await writeAuditLog({
      actorId: null,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: "login",
      meta: { outcome: "DENY", reason: "VALIDATION_ERROR" },
      req,
    });
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid credentials"), { status: 400 });
  }

  const { email, password, recaptchaToken, next: nextRaw } = parsed.data;

  if (recaptchaToken) {
    const recaptcha = await verifyRecaptcha(recaptchaToken, "login");
    if (!recaptcha.success) {
      await writeAuditLog({
        actorId: null,
        action: AuditAction.LOGIN,
        entityType: "Auth",
        entityId: email,
        meta: { outcome: "DENY", reason: "RECAPTCHA_FAILED" },
        req,
      });
      return NextResponse.json(fail("RECAPTCHA_FAILED", "reCAPTCHA failed"), { status: 400 });
    }
  }

  if (!requiredEmailDomain(email ?? "")) {
    await writeAuditLog({
      actorId: null,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: email ?? "invalid-domain",
      meta: { outcome: "DENY", reason: "INVALID_EMAIL_DOMAIN" },
      req,
    });
    return NextResponse.json(
      fail("INVALID_EMAIL_DOMAIN", "Email must end with @iiclakshya.com"),
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
      departmentId: true,
      subDepartmentId: true,
    },
  });

  if (!user?.isActive) {
    await writeAuditLog({
      actorId: user?.id ?? null,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: email,
      meta: { outcome: "DENY", reason: user ? "INACTIVE" : "NOT_FOUND" },
      req,
    });
    return NextResponse.json(fail("INVALID_CREDENTIALS", "Invalid credentials"), { status: 401 });
  }

  if (!user.passwordHash) {
    await writeAuditLog({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: user.id,
      meta: { outcome: "DENY", reason: "PASSWORD_NOT_SET_USE_OTP_OR_GOOGLE" },
      req,
    });
    return NextResponse.json(
      fail(
        "USE_OTP_OR_GOOGLE",
        "This account uses email code or Google sign-in. Use those options on the login page.",
      ),
      { status: 400 },
    );
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    await writeAuditLog({
      actorId: user.id,
      action: AuditAction.LOGIN,
      entityType: "Auth",
      entityId: user.id,
      entityTitle: user.email,
      meta: { outcome: "DENY", reason: "BAD_PASSWORD" },
      req,
    });
    return NextResponse.json(fail("INVALID_CREDENTIALS", "Invalid credentials"), { status: 401 });
  }

  const token = await createSessionToken({
    sub: user.id,
    role: user.role,
    departmentId: user.departmentId,
    subDepartmentId: user.subDepartmentId,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await writeAuditLog({
    actorId: user.id,
    action: AuditAction.LOGIN,
    entityType: "Auth",
    entityId: user.id,
    entityTitle: user.email,
    meta: { outcome: "ALLOW", role: user.role },
    req,
  });
  return NextResponse.json(ok({ redirectTo: safeNextPath(nextRaw) }), { status: 200 });
}

