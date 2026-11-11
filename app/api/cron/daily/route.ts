import { timingSafeEqual } from "node:crypto";
import { retryPending } from "@/lib/notifications";
import { sendAvailabilityReminders } from "@/lib/reminders-job";

// The daily morning job (technical plan, section 6b): availability reminders, then
// a retry of any email that didn't go out. Vercel Cron calls it with
// "Authorization: Bearer $CRON_SECRET"; anyone else gets 401.

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const reminders = await sendAvailabilityReminders();
  const retried = await retryPending();
  return Response.json({ ok: true, reminders, retried });
}
