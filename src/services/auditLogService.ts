import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/authz";
import { prismaWhereAuditLogsVisibleTo } from "@/lib/audit-log-visibility";

type ListInput = {
  actor: Actor;
  limit: number;
  cursor?: string;
};

export async function listAuditLogs(input: ListInput) {
  const { actor, limit, cursor } = input;

  const where = prismaWhereAuditLogsVisibleTo(actor.role);

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      createdAt: true,
      action: true,
      entityType: true,
      entityId: true,
      entityTitle: true,
      ipAddress: true,
      userAgent: true,
      meta: true,
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    entityTitle: r.entityTitle,
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    meta: r.meta,
    actor: r.actor
      ? {
          id: r.actor.id,
          name: r.actor.name,
          email: r.actor.email,
          role: r.actor.role,
          departmentId: r.actor.departmentId,
        }
      : null,
  }));

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  };
}

