/** Safe path for post-login redirect (open redirect hardening). */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/departments";
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("\0")) return "/departments";
  return t;
}
