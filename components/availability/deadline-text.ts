import { deadlineFor, type DeadlineSettings } from "@/lib/availability";
import { formatDay, formatTime, formatWeek, type IsoDate } from "@/lib/dates";

/** "Changes for Jun 15 – 21 are due by Thu, Jun 11 at 6 PM." or null when there's no deadline. */
export function deadlineText(monday: IsoDate, settings: DeadlineSettings): string | null {
  if (!settings.enabled) return null;
  const d = deadlineFor(monday, settings);
  return `Changes for ${formatWeek(monday)} are due by ${formatDay(d.date)} at ${formatTime(d.time)}.`;
}
