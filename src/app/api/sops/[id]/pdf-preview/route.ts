import { NextResponse } from "next/server";
import { fail } from "@/lib/apiResponse";
import { requireActor } from "@/lib/authz";
import { getSopPdfPreviewPayload } from "@/lib/sop-pdf-preview-data";

/** Published SOP A4 preview for normal users (EMPLOYEE) on `/sops/[id]`. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireActor();
  if (!auth.ok) {
    return NextResponse.json(fail(auth.code, auth.code === "UNAUTHORIZED" ? "Not authenticated" : "Forbidden"), {
      status: auth.code === "UNAUTHORIZED" ? 401 : 403,
    });
  }

  const { id } = await ctx.params;

  const result = await getSopPdfPreviewPayload(id, { requirePublished: true });
  if (!result.ok) {
    if (result.code === "NOT_FOUND" || result.code === "NO_VERSION") {
      return NextResponse.json(fail("NOT_FOUND", "SOP not found"), { status: 404 });
    }
    return NextResponse.json(fail("VALIDATION_ERROR", "This SOP does not have viewable content."), { status: 400 });
  }

  return NextResponse.json({ success: true as const, data: result.data });
}
