import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, sendTransactionalEmail } from "@/lib/email";

export type SopNotifyPayload = {
  userId: string;
  title: string;
  message: string;
  link?: string | null;
};

export async function createSopNotificationInTx(
  tx: Prisma.TransactionClient,
  p: SopNotifyPayload,
): Promise<void> {
  await tx.notification.create({
    data: {
      userId: p.userId,
      title: p.title,
      message: p.message,
      link: p.link ?? undefined,
    },
  });
}

function emailBodyForNotification(p: SopNotifyPayload): string {
  const base = appBaseUrl();
  const path = p.link?.startsWith("/") ? p.link : p.link ? `/${p.link}` : "";
  const url = base && path ? `${base}${path}` : path || base || "";
  const suffix = url ? `\n\nOpen in SOP Central: ${url}` : "";
  return `${p.message}${suffix}`;
}

/** Runs after DB commit; does not throw to callers */
export function queueSopNotificationEmail(p: SopNotifyPayload): void {
  void (async () => {
    const user = await prisma.user.findUnique({
      where: { id: p.userId },
      select: { email: true, isActive: true, deletedAt: true },
    });
    if (!user?.email?.trim() || !user.isActive || user.deletedAt) return;
    await sendTransactionalEmail({
      to: user.email.trim(),
      subject: p.title,
      text: emailBodyForNotification(p),
    });
  })();
}

export function queueSopNotificationEmails(payloads: SopNotifyPayload[]): void {
  for (const p of payloads) {
    queueSopNotificationEmail(p);
  }
}
