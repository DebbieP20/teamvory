import { type DeadlineSettings, deadlineFor } from "@/lib/availability";
import { dayOfWeek, formatDay, formatTime, formatWeek, type IsoDate, WEEKDAYS } from "@/lib/dates";
import { type EmailBlock, type RenderedEmail, renderEmail } from "@/lib/email-content";

// Availability reminders (decision 26, section 6b). Pure rules, unit tested;
// the daily job in lib/reminders-job.ts sends them.

export type ReminderSettings = { enabled: boolean; startDay: number; days: number; includeDefaultOnly: boolean };

/** Is `today` one of the reminder days (start day and the days after it, in the week before)? */
export function isReminderDay(settings: ReminderSettings, today: IsoDate): boolean {
  const d = dayOfWeek(today);
  return settings.enabled && d >= settings.startDay && d < settings.startDay + settings.days;
}

/**
 * Who gets a reminder: people who haven't set availability for next week ("missing"),
 * and, only with the extra option, people relying on their default week ("check").
 */
export function reminderKind(
  person: { hasDefaultWeek: boolean; hasChangesNextWeek: boolean },
  includeDefaultOnly: boolean,
): "missing" | "check" | null {
  if (!person.hasDefaultWeek && !person.hasChangesNextWeek) return "missing";
  if (includeDefaultOnly && person.hasDefaultWeek && !person.hasChangesNextWeek) return "check";
  return null;
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
  kind: "missing" | "check";
  deadline: DeadlineSettings;
  link: string;
}): RenderedEmail {
  const week = formatWeek(opts.nextMonday);
  const due = opts.deadline.enabled ? deadlineFor(opts.nextMonday, opts.deadline) : null;
  const dueLine: EmailBlock[] = due ? [{ type: "p", text: `It's due ${formatDay(due.date)} at ${formatTime(due.time)}.` }] : [];
  const common = { greeting: `Hi ${opts.name.split(" ")[0]},`, businessName: opts.businessName, icon: "reminder" as const };
  if (opts.kind === "missing") {
    return renderEmail({
      ...common,
      subject: `Reminder: add your availability for ${week}`,
      heading: `Add your availability for ${week}`,
      blocks: [
        { type: "p", text: `${opts.businessName} is planning the schedule for ${week}, and your availability isn't in yet. It takes a minute.` },
        ...dueLine,
        { type: "button", label: "Add my availability", url: opts.link },
      ],
    });
  }
  return renderEmail({
    ...common,
    subject: `Is your availability for ${week} still right?`,
    heading: `Is your availability for ${week} still right?`,
    blocks: [
      { type: "p", text: `${opts.businessName} is planning the schedule for ${week}. You're using your usual week. If anything is different, change it here.` },
      ...dueLine,
      { type: "button", label: "Check my availability", url: opts.link },
      { type: "small", text: "If nothing changed, you don't need to do anything." },
    ],
  });
}
