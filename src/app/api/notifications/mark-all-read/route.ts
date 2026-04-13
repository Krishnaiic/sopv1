import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/apiResponse";
import { requireActor, ADMIN_PORTAL_ROLES } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

/** Mark all notifications as read for the authenticated admin-portal user. */
export async function POST() {
  const auth = await requireActor(ADMIN_PORTAL_ROLES);
  if (!auth.ok) {
    return NextResponse.json(
      fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"),
      { status: auth.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  await prisma.notification.updateMany({
    where: { userId: auth.actor.id, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json(ok({ updated: true }), { status: 200 });
}
