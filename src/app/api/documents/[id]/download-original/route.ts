import { NextResponse } from "next/server";
import { fail } from "@/lib/apiResponse";
import {
  ADMIN_PORTAL_ROLES,
  canManageDepartmentScoped,
  canSupervisorViewDepartmentSop,
  requireActor,
} from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { DocumentType, Role } from "@/generated/prisma/enums";
import { signedDownloadUrlForSopPublicUrl } from "@/lib/s3-sop-upload";
import { getS3SopEnv } from "@/lib/s3-sop-upload";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type VersionContent = {
  sourceFileUrl?: string;
  sourceFileName?: string;
  fileKind?: string;
  videoS3Key?: string;
};

function canViewDocument(
  actor: { role: Role; departmentId: string | null; subDepartmentId: string | null; id: string },
  doc: { departmentId: string; subDepartmentId: string | null; departmentCreatedById: string | null },
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
  const url = new URL(req.url);
  const versionId = url.searchParams.get("versionId")?.trim() || null;

  const doc = await prisma.document.findFirst({
    where: { id, type: DocumentType.SOP, deletedAt: null },
    select: {
      id: true,
      title: true,
      departmentId: true,
      subDepartmentId: true,
      department: { select: { createdById: true } },
      latestVersionId: true,
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

  const version = await prisma.documentVersion.findFirst({
    where: {
      id: versionId ?? doc.latestVersionId ?? undefined,
      documentId: doc.id,
      deletedAt: null,
    },
    select: { content: true },
  });

  const content = (version?.content ?? {}) as VersionContent;
  const sourceFileUrl = typeof content.sourceFileUrl === "string" ? content.sourceFileUrl.trim() : "";
  const sourceFileName = typeof content.sourceFileName === "string" ? content.sourceFileName.trim() : "";
  const fileKind = typeof content.fileKind === "string" ? content.fileKind.trim().toUpperCase() : "";
  const videoS3Key = typeof content.videoS3Key === "string" ? content.videoS3Key.trim() : "";

  if (!sourceFileUrl) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Original file is not available for this SOP."), { status: 400 });
  }

  // Video-only SOP: download the actual video file (attachment) from S3.
  if (fileKind === "VIDEO" && videoS3Key.startsWith("sop-videos/")) {
    const env = getS3SopEnv();
    if (!env) return NextResponse.json(fail("SERVICE_UNAVAILABLE", "S3 is not configured"), { status: 503 });

    const client = new S3Client({
      region: env.region,
      credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    });

    const fallbackName = `${doc.title}.mp4`;
    const safeName = (sourceFileName || fallbackName).replace(/["\\r\\n]/g, "");
    const signed = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: env.bucket,
        Key: videoS3Key,
        ResponseContentDisposition: `attachment; filename="${safeName}"`,
      }),
      { expiresIn: 60 },
    );

    return NextResponse.redirect(signed, { status: 302 });
  }

  // If the stored URL is not S3/private, just redirect.
  if (!sourceFileUrl.startsWith("https://")) {
    return NextResponse.redirect(sourceFileUrl);
  }

  const signed = await signedDownloadUrlForSopPublicUrl({
    publicUrl: sourceFileUrl,
    fileName: sourceFileName || `${doc.title}.docx`,
    expiresInSeconds: 60,
  });
  if (!signed.ok) {
    return NextResponse.json(fail("VALIDATION_ERROR", signed.message), { status: 400 });
  }

  return NextResponse.redirect(signed.url, { status: 302 });
}

