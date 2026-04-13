import { NextResponse } from "next/server";
import { fail } from "@/lib/apiResponse";
import {
  type Actor,
  canManageDepartmentScoped,
  canSupervisorViewDepartmentSop,
  requireActor,
  ADMIN_PORTAL_ROLES,
} from "@/lib/authz";
import { getSopPdfPreviewPayload } from "@/lib/sop-pdf-preview-data";
import { prisma } from "@/lib/prisma";
import { DocumentType } from "@/generated/prisma/enums";

function canViewDocument(
  actor: Actor,
  doc: {
    departmentId: string;
    subDepartmentId: string | null;
    departmentCreatedById: string | null;
  },
) {
  if (canManageDepartmentScoped(actor, doc.departmentId, doc.departmentCreatedById)) return true;
  if (canSupervisorViewDepartmentSop(actor, doc)) return true;
  return false;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireActor(ADMIN_PORTAL_ROLES);
  if (!auth.ok) {
    return NextResponse.json(fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"), {
      status: auth.code === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const { id } = await ctx.params;
  const versionId = new URL(req.url).searchParams.get("versionId")?.trim() || null;

  const doc = await prisma.document.findFirst({
    where: { id, type: DocumentType.SOP, deletedAt: null },
    select: {
      departmentId: true,
      subDepartmentId: true,
      department: { select: { createdById: true } },
    },
  });

  if (!doc) {
    return NextResponse.json(fail("NOT_FOUND", "Document not found"), { status: 404 });
  }
  if (
    !canViewDocument(auth.actor, {
      departmentId: doc.departmentId,
      subDepartmentId: doc.subDepartmentId,
      departmentCreatedById: doc.department.createdById,
    })
  ) {
    return NextResponse.json(fail("FORBIDDEN", "Forbidden"), { status: 403 });
  }

  const result = await getSopPdfPreviewPayload(id, { versionId, requirePublished: false });
  if (!result.ok) {
    if (result.code === "NOT_FOUND") {
      return NextResponse.json(fail("NOT_FOUND", "Document not found"), { status: 404 });
    }
    if (result.code === "NO_VERSION") {
      return NextResponse.json(fail("NOT_FOUND", "Version not found"), { status: 404 });
    }
    return NextResponse.json(fail("VALIDATION_ERROR", "This SOP does not have editable content to preview."), {
      status: 400,
    });
  }

  return NextResponse.json({ success: true as const, data: result.data });
}
