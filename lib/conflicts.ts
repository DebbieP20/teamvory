import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { describeShift } from "@/lib/schedule";
import { publishedConflicts, selectedWeek } from "@/lib/schedule-data";
import { appUrl } from "@/lib/urls";

/**
 * After someone changes their own availability: if it clashes with a shift they were
 * already published on, each owner/manager gets ONE email per clash (section 3).
 * The change is still saved, and the schedule doesn't change by itself.
 */
export async function notifyManagersOfConflicts(businessId: string, membershipId: string) {
  const conflicts = await publishedConflicts(businessId, membershipId);
  if (!conflicts.length) return;
  const [{ weeks }, managers, business] = await Promise.all([
    selectedWeek(businessId, undefined),
    db.membership.findMany({
      where: { businessId, status: "ACTIVE", role: { in: ["OWNER", "MANAGER"] } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    db.business.findUniqueOrThrow({ where: { id: businessId }, select: { name: true } }),
  ]);
  await notify(
    conflicts.flatMap((c) => {
      const week = c.shift.date >= weeks.nextWeek ? "next" : "this";
      return managers.map((m) => ({
        businessId,
        userId: m.user.id,
        type: "availability-conflict" as const,
        dedupeKey: `conflict:${c.scheduleId}:${c.shift.shiftId}:${c.membershipId}:${m.id}`,
        to: m.user.email,
        subject: `${c.name} can't work ${describeShift(c.shift)}`,
        text:
          `Hi ${m.user.name.split(" ")[0]},\n\n${c.name} changed their availability and can no longer work a shift on ` +
          `${business.name}'s published schedule:\n\n• ${describeShift(c.shift)} (${c.reason})\n\n` +
          `The schedule hasn't changed. Open it to find cover or talk with them:\n${appUrl()}/manager/schedule?week=${week}\n`,
      }));
    }),
  );
}
