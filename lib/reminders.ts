import { type DeadlineSettings, deadlineFor } from "@/lib/availability";
import { dayOfWeek, formatDay, formatTime, formatWeek, type IsoDate, WEEKDAYS } from "@/lib/dates";
import { type EmailBlock, type RenderedEmail, renderEmail } from "@/lib/email-content";

// Availability reminders (decision 26, section 6b). Pure rules, unit tested;
// the daily job in lib/reminders-job.ts sends them.

export type ReminderSettings = { enabled: boolean; startDay: number; days: number };

/** Is `today` one of the reminder days (start day and the days after it, in the week before)? */
export function isReminderDay(settings: ReminderSettings, today: IsoDate): boolean {
  const d = dayOfWeek(today);
  return settings.enabled && d >= settings.startDay && d < settings.startDay + settings.days;
}

/** "Wednesday and Thursday", for the settings page. */
export function describeReminderDays(settings: Pick<ReminderSettings, "startDay" | "days">): string {
  const names = Array.from({ length: settings.days }, (_, i) => WEEKDAYS[settings.startDay - 1 + i]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];
}

export function reminderEmail(opts: {
  name: string;
  businessName: string;
  nextMonday: IsoDate;
  deadline: DeadlineSettings;
  link: string;
}): RenderedEmail {
  const week = formatWeek(opts.nextMonday);
  const due = opts.deadline.enabled ? deadlineFor(opts.nextMonday, opts.deadline) : null;
  const dueLine: EmailBlock[] = due ? [{ type: "p", text: `It's due ${formatDay(due.date)} at ${formatTime(due.time)}.` }] : [];
  const common = { greeting: `Hi ${opts.name.split(" ")[0]},`, businessName: opts.businessName, icon: "reminder" as const };
  return renderEmail({
    ...common,
    subject: `Reminder: send your availability for ${week}`,
    heading: `Time to send your availability for ${week}`,
    blocks: [
      { type: "p", text: `${opts.businessName} is planning the schedule for ${week}, and your availability isn't in yet. Choose when you can work each day and send it. It takes a minute.` },
      ...dueLine,
      { type: "button", label: "Send my availability", url: opts.link },
      { type: "small", text: "Until you send it, you won't be scheduled that week." },
    ],
  });
}
