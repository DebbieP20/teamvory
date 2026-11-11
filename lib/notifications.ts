import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// The notification outbox (technical plan, section 3): automatic emails are saved
// first, then sent. The dedupeKey means the same notification never goes out twice,
// even if an action or the daily job runs again. Failed sends are retried by the daily job.

export type OutgoingNotification = {
  businessId: string;
  userId: string;
  type: "schedule-published" | "schedule-changed" | "availability-reminder" | "availability-conflict";
  dedupeKey: string;
  to: string;
  subject: string;
  text: string;
};

const MAX_ATTEMPTS = 5;

/** Saves the notifications (skipping any already sent) and sends the new ones. Returns how many were new. */
export async function notify(items: OutgoingNotification[]): Promise<number> {
  if (!items.length) return 0;
  const keys = items.map((i) => i.dedupeKey);
  const existing = new Set(
    (await db.notification.findMany({ where: { dedupeKey: { in: keys } }, select: { dedupeKey: true } })).map((n) => n.dedupeKey),
  );
  const fresh = items.filter((i) => !existing.has(i.dedupeKey));
  if (!fresh.length) return 0;
  await db.notification.createMany({ data: fresh, skipDuplicates: true });
  const saved = await db.notification.findMany({ where: { dedupeKey: { in: fresh.map((i) => i.dedupeKey) }, status: "PENDING" } });
  await Promise.all(saved.map(deliver));
  return fresh.length;
}

async function deliver(n: { id: string; to: string; subject: string; text: string; attempts: number }) {
  let sent = false;
  let error: string | null = null;
  try {
    sent = await sendEmail({ to: n.to, subject: n.subject, text: n.text });
    // Without an email service (a developer's computer) it was printed to the log: don't retry.
    if (!sent && !process.env.RESEND_API_KEY) return markSent(n.id, attempts(n), "Printed to the server log (no email service)");
    if (!sent) error = "Email service unavailable";
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (sent) return markSent(n.id, attempts(n), null);
  await db.notification.update({
    where: { id: n.id },
    data: { status: attempts(n) >= MAX_ATTEMPTS ? "FAILED" : "PENDING", attempts: attempts(n), lastError: error },
  });
}

const attempts = (n: { attempts: number }) => n.attempts + 1;

async function markSent(id: string, attempts: number, note: string | null) {
  await db.notification.update({ where: { id }, data: { status: "SENT", attempts, sentAt: new Date(), lastError: note } });
}

/** The daily job: tries again anything that didn't go out (oldest first). */
export async function retryPending(limit = 100): Promise<number> {
  const pending = await db.notification.findMany({
    where: { status: "PENDING", attempts: { gt: 0, lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  for (const n of pending) await deliver(n);
  return pending.length;
}
