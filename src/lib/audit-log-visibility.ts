import { Role } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";

/**
 * Roles whose audit log entries a viewer may see (by **actor** who performed the action).
 * System rows (`actorId` null) are always included for all viewers who can open the logs UI.
 *
 * Hierarchy (strict, backend-only):
 * - SUPERVISOR → supervisors only
 * - DEPARTMENT_ADMIN → department admins + supervisors
 * - ADMIN → admins + department admins + supervisors
 * - SUPER_ADMIN → superadmin + admin + department admin + supervisor
 */
export function auditLogActorRolesForViewer(viewerRole: Role): Role[] {
  switch (viewerRole) {
    case Role.SUPER_ADMIN:
      return [Role.SUPER_ADMIN, Role.ADMIN, Role.DEPARTMENT_ADMIN, Role.SUPERVISOR];
    case Role.ADMIN:
      return [Role.ADMIN, Role.DEPARTMENT_ADMIN, Role.SUPERVISOR];
    case Role.DEPARTMENT_ADMIN:
      return [Role.DEPARTMENT_ADMIN, Role.SUPERVISOR];
    case Role.SUPERVISOR:
      return [Role.SUPERVISOR];
    default:
      return [];
  }
}

export function prismaWhereAuditLogsVisibleTo(viewerRole: Role): Prisma.AuditLogWhereInput {
  const roles = auditLogActorRolesForViewer(viewerRole);
  if (roles.length === 0) {
    return { deletedAt: null, id: "__no_audit_for_role__" };
  }
  return {
    deletedAt: null,
    OR: [{ actorId: null }, { actor: { is: { role: { in: roles } } } }],
  };
}
