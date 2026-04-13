import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/apiResponse";
import { requireActor, ADMIN_PORTAL_ROLES } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { listNotificationsQuerySchema } from "@/validators/notificationValidators";

export async function GET(req: Request) {
  const auth = await requireActor(ADMIN_PORTAL_ROLES);
  if (!auth.ok) {
    return NextResponse.json(
      fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"),
      { status: auth.code === "UNAUTHORIZED" ? 401 : 403 },
    );
  }

  const url = new URL(req.url);
  const parsed = listNotificationsQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid query parameters"), { status: 400 });
  }

  const { page: rawPage, pageSize } = parsed.data;
  const userId = auth.actor.id;

  const totalCount = await prisma.notification.count({ where: { userId } });
  const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / pageSize);
  const page = totalCount === 0 ? 1 : Math.min(Math.max(1, rawPage), totalPages);
  const skip = (page - 1) * pageSize;

  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip,
    take: pageSize,
    select: {
      id: true,
      title: true,
      message: true,
      isRead: true,
      link: true,
      createdAt: true,
    },
  });

  const items = rows.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    link: n.link,
    createdAt: n.createdAt.toISOString(),
  }));

  return NextResponse.json(
    ok({
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
    }),
    { status: 200 },
  );
}
