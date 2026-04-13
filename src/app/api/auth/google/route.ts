import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth-redirect";
import { buildGoogleAuthorizeUrl } from "@/lib/google-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const next = safeNextPath(searchParams.get("next"));
  const state = Buffer.from(JSON.stringify({ next, n: randomUUID() }), "utf8").toString("base64url");
  try {
    const url = buildGoogleAuthorizeUrl(state);
    return NextResponse.redirect(url);
  } catch {
    const u = new URL("/auth/login", req.url);
    u.searchParams.set("next", next);
    u.searchParams.set("error", "google_config");
    return NextResponse.redirect(u.toString());
  }
}
