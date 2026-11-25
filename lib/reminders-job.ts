import "server-only";
import { editableWeeks, isWeekLocked } from "@/lib/availability";
import { getBusinessSettings, missingAvailabilityWhere, today } from "@/lib/availability-data";
import { db } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { isReminderDay, reminderEmail } from "@/lib/reminders";
import { appUrl } from "@/lib/urls";

/**
 * The daily morning job's reminders: for each business whose reminder day is today,
 * email the people who still haven't sent their availability for next week. The dedupeKey
 * makes running it twice on the same day harmless.
 */
export async function sendAvailabilityReminders(): Promise<number> {
  const businesses = await db.business.findMany({ where: { reminderEnabled: true }, select: { id: true } });
  let sent = 0;
  for (const { id } of businesses) {
    const settings = await getBusinessSettings(id);
    const now = today(settings);
    if (!isReminderDay(settings.reminders, now.date)) continue;
    const { nextWeek } = editableWeeks(now.date);
    // After the deadline employees can't change it themselves, so a reminder would only confuse.
    if (isWeekLocked(nextWeek, settings.deadline, now)) continue;

    const people = await db.membership.findMany({
      where: missingAvailabilityWhere(id, nextWeek),
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    sent += await notify(
      people.flatMap((p) => {
        const email = reminderEmail({
          name: p.user.name,
          businessName: settings.name,
          nextMonday: nextWeek,
          deadline: settings.deadline,
          link: `${appUrl()}/employee/availability`,
        });
        return [
          {
            businessId: id,
            userId: p.user.id,
            type: "availability-reminder" as const,
            dedupeKey: `avail-reminder:${nextWeek}:${p.user.id}:${now.date}`,
            to: p.user.email,
            ...email,
          },
        ];
      }),
    );
  }
  return sent;
}
