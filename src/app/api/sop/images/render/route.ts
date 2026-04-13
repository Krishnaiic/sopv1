import { NextResponse } from "next/server";
import { fail } from "@/lib/apiResponse";
import { requireActor, ADMIN_PORTAL_ROLES } from "@/lib/authz";
import { getS3SopEnv } from "@/lib/s3-sop-upload";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const IMAGE_PREFIX = "sop-images/";

export async function GET(req: Request) {
  const auth = await requireActor(ADMIN_PORTAL_ROLES);
  if (!auth.ok) {
    return NextResponse.json(fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"), {
      status: auth.code === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const env = getS3SopEnv();
  if (!env) return NextResponse.json(fail("VALIDATION_ERROR", "S3 is not configured"), { status: 400 });

  const url = new URL(req.url);
  const key = url.searchParams.get("key")?.trim() || "";
  if (!key || key.includes("..") || key.startsWith("/") || !key.startsWith(IMAGE_PREFIX)) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Invalid image key"), { status: 400 });
  }

  const client = new S3Client({
    region: env.region,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  });

  const signed = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: env.bucket,
      Key: key,
    }),
    { expiresIn: 60 },
  );

  return NextResponse.redirect(signed, { status: 302 });
}

