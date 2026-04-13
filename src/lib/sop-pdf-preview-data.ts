import { prisma } from "@/lib/prisma";
import { prepareEditableHtmlForWebPreview } from "@/lib/sop-pdf-html-pipeline";
import { sanitizeEditableHtml } from "@/lib/sop-editable-content";
import { DocumentType } from "@/generated/prisma/enums";

type VersionContent = {
  documentTitle?: string;
  version?: string;
  effectiveDate?: string;
  editableHtml?: string;
};

export type SopPdfPreviewPayload = {
  title: string;
  version: string;
  effectiveDate: string;
  departmentLabel: string;
  bodyHtml: string;
};

export async function getSopPdfPreviewPayload(
  documentId: string,
  options: { versionId?: string | null; requirePublished?: boolean } = {},
): Promise<
  { ok: true; data: SopPdfPreviewPayload } | { ok: false; code: "NOT_FOUND" | "NO_CONTENT" | "NO_VERSION" }
> {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      type: DocumentType.SOP,
      deletedAt: null,
      ...(options.requirePublished ? { isPublished: true } : {}),
    },
    select: {
      id: true,
      title: true,
      departmentId: true,
      subDepartmentId: true,
      department: { select: { name: true, createdById: true } },
      subDepartment: { select: { name: true } },
    },
  });

  if (!doc) {
    return { ok: false, code: "NOT_FOUND" };
  }

  const versionRow = await prisma.documentVersion.findFirst({
    where: {
      documentId,
      deletedAt: null,
      ...(options.versionId ? { id: options.versionId } : { isLatest: true }),
    },
    select: { content: true },
  });

  if (!versionRow) {
    return { ok: false, code: "NO_VERSION" };
  }

  const content = (versionRow.content ?? {}) as VersionContent;
  const editableHtml = typeof content.editableHtml === "string" ? content.editableHtml.trim() : "";
  if (!editableHtml) {
    return { ok: false, code: "NO_CONTENT" };
  }

  const departmentLabel = doc.subDepartment?.name
    ? `${doc.department.name} / ${doc.subDepartment.name}`
    : doc.department.name;

  const prepared = await prepareEditableHtmlForWebPreview(editableHtml);
  const bodyHtml = sanitizeEditableHtml(prepared);

  return {
    ok: true,
    data: {
      title: content.documentTitle?.trim() || doc.title,
      version: content.version?.trim() || "1.0",
      effectiveDate: content.effectiveDate?.trim() || "",
      departmentLabel,
      bodyHtml,
    },
  };
}
