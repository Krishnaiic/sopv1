import { NextResponse } from "next/server";
import { setAuthSessionCookie } from "@/lib/auth-cookie";
import { safeNextPath } from "@/lib/auth-redirect";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { AuditAction, Role } from "@/generated/prisma/enums";
import { requiredEmailDomain } from "@/lib/recaptcha";
import { exchangeGoogleAuthCode, fetchGoogleUserInfo } from "@/lib/google-oauth";

function loginErrorUrl(req: Request, next: string, code: string): string {
  const u = new URL("/auth/login", req.url);
  u.searchParams.set("next", next);
  u.searchParams.set("error", code);
  return u.toString();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const err = searchParams.get("error");
  if (err) {
    return NextResponse.redirect(loginErrorUrl(req, "/departments", "google_denied"));
  }

  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  let nextPath = "/departments";
  try {
    if (stateParam) {
      const parsed = JSON.parse(Buffer.from(stateParam, "base64url").toString("utf8")) as { next?: string };
      nextPath = safeNextPath(parsed.next);
    }
  } catch {
    nextPath = "/departments";
  }

  if (!code) {
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "google_no_code"));
  }

  let accessToken: string;
  try {
    const tokens = await exchangeGoogleAuthCode(code);
    accessToken = tokens.access_token;
  } catch {
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "google_token"));
  }

  let info: Awaited<ReturnType<typeof fetchGoogleUserInfo>>;
  try {
    info = await fetchGoogleUserInfo(accessToken);
  } catch {
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "google_profile"));
  }

  const emailRaw = info.email.trim().toLowerCase();
  if (!requiredEmailDomain(emailRaw)) {
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "domain_not_allowed"));
  }

  if (info.email_verified === false) {
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "email_not_verified"));
  }

  const name =
    info.name?.trim() ||
    emailRaw
      .split("@")[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");

  let user = await prisma.user.findUnique({
    where: { email: emailRaw },
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
        email: emailRaw,
        name,
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
    return NextResponse.redirect(loginErrorUrl(req, nextPath, "inactive"));
  }

  await setAuthSessionCookie({
    id: user.id,
    role: user.role,
    departmentId: user.departmentId,
    subDepartmentId: user.subDepartmentId,
  });

  // User portal OAuth: never redirect to /admin (admin sign-in is /admin/login only).
  const path = nextPath;

  await writeAuditLog({
    actorId: user.id,
    action: AuditAction.LOGIN,
    entityType: "Auth",
    entityId: user.id,
    meta: { outcome: "ALLOW", role: user.role, via: "GOOGLE" },
    req,
  });

  return NextResponse.redirect(new URL(path, req.url).toString());
}
