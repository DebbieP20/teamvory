import { type DeadlineSettings, deadlineFor } from "@/lib/availability";
import { dayOfWeek, formatDay, formatTime, formatWeek, type IsoDate, WEEKDAYS } from "@/lib/dates";

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
}): { subject: string; text: string } {
  const week = formatWeek(opts.nextMonday);
  const due = opts.deadline.enabled ? deadlineFor(opts.nextMonday, opts.deadline) : null;
  const dueLine = due ? `\nIt's due ${formatDay(due.date)} at ${formatTime(due.time)}.\n` : "";
  const first = opts.name.split(" ")[0];
  if (opts.kind === "missing") {
    return {
      subject: `Reminder: add your availability for ${week}`,
      text: `Hi ${first},\n\n${opts.businessName} is planning the schedule for ${week}, and your availability isn't in yet.\n${dueLine}\nIt takes a minute: ${opts.link}\n`,
    };
  }
  return {
    subject: `Is your availability for ${week} still right?`,
    text: `Hi ${first},\n\n${opts.businessName} is planning the schedule for ${week}. You're using your usual week. If anything is different, change it here:\n${opts.link}\n${dueLine}\nIf nothing changed, you don't need to do anything.\n`,
  };
}
