import { createHmac, randomInt } from "crypto";

function otpPepper(): string {
  const s = process.env.OTP_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();
  if (!s) throw new Error("Set OTP_SECRET or NEXTAUTH_SECRET for email OTP login.");
  return s;
}

export function hashEmailOtp(email: string, code: string): string {
  const normalized = email.trim().toLowerCase();
  return createHmac("sha256", otpPepper()).update(`${normalized}:${code}`).digest("hex");
}

export function verifyEmailOtp(email: string, code: string, codeHash: string): boolean {
  const candidate = hashEmailOtp(email, code);
  return candidate.length === codeHash.length && candidate === codeHash;
}

export function generateSixDigitOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
