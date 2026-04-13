import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER?.trim();
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: port === 465,
    ...(user
      ? {
          auth: {
            user,
            pass: process.env.SMTP_PASS ?? "",
          },
        }
      : {}),
  });
  return transporter;
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = getTransporter();
  const from = process.env.SMTP_FROM?.trim();
  if (!t || !from) {
    return { ok: false, error: "SMTP not configured" };
  }
  try {
    await t.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export function appBaseUrl(): string {
  const raw = process.env.BASE_URL || process.env.NEXT_PUBLIC_API_URL || "";
  return raw.replace(/\/$/, "");
}
