import { appBaseUrl } from "@/lib/email";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing ${name} for Google sign-in`);
  return v;
}

/** Must match exactly what you configure in Google Cloud Console → OAuth client → Authorized redirect URIs. */
export function getGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const base = appBaseUrl() || process.env.BASE_URL?.trim().replace(/\/$/, "") || "";
  if (base) return `${base}/api/auth/google/callback`;
  throw new Error("Set GOOGLE_REDIRECT_URI or BASE_URL / NEXT_PUBLIC_API_URL for Google OAuth.");
}

export function buildGoogleAuthorizeUrl(state: string): string {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const redirectUri = getGoogleRedirectUri();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    include_granted_scopes: "true",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleAuthCode(code: string): Promise<{
  access_token: string;
  id_token?: string;
}> {
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = getGoogleRedirectUri();
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google token exchange failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token?: string; id_token?: string };
  if (!data.access_token) throw new Error("Google token response missing access_token");
  return { access_token: data.access_token, id_token: data.id_token };
}

export type GoogleUserInfo = {
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Google userinfo failed: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as GoogleUserInfo & { sub?: string };
  if (!data.email?.trim()) throw new Error("Google did not return an email address.");
  return data;
}
