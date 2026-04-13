import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { cookies } from "next/headers";

export async function setAuthSessionCookie(user: {
  id: string;
  role: Role;
  departmentId: string | null;
  subDepartmentId: string | null;
}): Promise<void> {
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
}
