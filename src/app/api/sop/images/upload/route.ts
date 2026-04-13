import { NextResponse } from "next/server";
import { ok, fail } from "@/lib/apiResponse";
import { requireActor, SOP_LIBRARY_UPLOAD_ROLES } from "@/lib/authz";
import { getS3SopEnv } from "@/lib/s3-sop-upload";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const IMAGE_PREFIX = "sop-images/";

function safeFileName(original: string, fallbackExt: string) {
  const trimmed = (original || "").trim();
  const base = trimmed.replace(/[^\w.\-() ]+/g, "_").slice(0, 80) || "image";
  const ext = (base.includes(".") ? (base.split(".").pop() ?? "") : "").toLowerCase();
  const finalExt = ext && ext.length <= 5 ? ext : fallbackExt;
  return `${base.replace(/\.[^.]+$/, "")}.${finalExt}`;
}

export async function POST(req: Request) {
  const auth = await requireActor(SOP_LIBRARY_UPLOAD_ROLES);
  if (!auth.ok) {
    return NextResponse.json(fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"), {
      status: auth.code === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const env = getS3SopEnv();
  if (!env) {
    return NextResponse.json(fail("VALIDATION_ERROR", "S3 is not configured"), { status: 400 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json(fail("VALIDATION_ERROR", "Invalid form data"), { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(fail("VALIDATION_ERROR", "File is required"), { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  if (!mime.startsWith("image/")) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Only image files are allowed"), { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Max image size is 5MB"), { status: 400 });
  }

  const fallbackExt = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
  const name = safeFileName(file.name, fallbackExt);
  const key = `${IMAGE_PREFIX}${randomUUID()}-${name}`;

  const client = new S3Client({
    region: env.region,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: env.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    }),
  );

  // Return the key; client will render via our signed image proxy.
  return NextResponse.json(ok({ key, fileName: name, mime }), { status: 200 });
}

