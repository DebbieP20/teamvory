import { addDays, dayOfWeek, formatTime, type IsoDate, weekStart } from "@/lib/dates";

// How someone's availability for a day is worked out (technical plan, section 3):
// start from their default week, apply that date's change, then time off on top.
// Pure functions, so the rules are easy to test.

export type Kind = "OFF" | "ALL_DAY" | "CUSTOM";
export type DaySetting = { kind: Kind; startTime?: string | null; endTime?: string | null };
export type TimeOffEntry = { startDate: IsoDate; endDate: IsoDate; status: "PENDING" | "APPROVED" | "DECLINED" };

export type ResolvedDay = DaySetting & {
  /** Where the answer came from, for labels like "Default" / "Changed". */
  source: "default" | "change" | "time-off" | "pending-time-off" | "not-set";
};

export function resolveDay(
  date: IsoDate,
  template: Map<number, DaySetting>,
  overrides: Map<IsoDate, DaySetting>,
  timeOff: TimeOffEntry[],
): ResolvedDay {
  const covering = timeOff.filter((t) => t.status !== "DECLINED" && t.startDate <= date && date <= t.endDate);
  // Pending time off counts as unavailable, the safe choice (decision 30).
  if (covering.some((t) => t.status === "APPROVED")) return { kind: "OFF", source: "time-off" };
  if (covering.length) return { kind: "OFF", source: "pending-time-off" };

  const change = overrides.get(date);
  if (change) return { ...pick(change), source: "change" };
  const usual = template.get(dayOfWeek(date));
  if (usual) return { ...pick(usual), source: "default" };
  return { kind: "OFF", source: "not-set" };
}

const pick = (d: DaySetting): DaySetting => ({ kind: d.kind, startTime: d.startTime ?? null, endTime: d.endTime ?? null });

/** "All day", "2 PM – 9 PM" or "Not available". */
export function describe(setting: DaySetting): string {
  if (setting.kind === "ALL_DAY") return "All day";
  if (setting.kind === "CUSTOM" && setting.startTime && setting.endTime) {
    return `${formatTime(setting.startTime)} – ${formatTime(setting.endTime)}`;
  }
  return "Not available";
}

/** Checks a day before saving it. Returns an error message, or null if it's fine. */
export function validateDay(setting: DaySetting): string | null {
  if (setting.kind !== "CUSTOM") return null;
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!setting.startTime || !setting.endTime || !valid.test(setting.startTime) || !valid.test(setting.endTime)) {
    return "Choose a start and end time.";
  }
  if (setting.startTime >= setting.endTime) return "The end time must be after the start time.";
  return null;
}

// --- Availability deadline (decision 29) ---------------------------------

export type DeadlineSettings = { enabled: boolean; day: number; time: string };

/**
 * The deadline for the week starting `monday`, as a local date and time:
 * the chosen weekday and time in the week before. E.g. Thursday 6 PM.
 */
export function deadlineFor(monday: IsoDate, settings: DeadlineSettings): { date: IsoDate; time: string } {
  return { date: addDays(monday, settings.day - 8), time: settings.time };
}

/** True when employees can no longer change their own availability for that week. */
export function isWeekLocked(monday: IsoDate, settings: DeadlineSettings, now: { date: IsoDate; time: string }): boolean {
  if (!settings.enabled) return false;
  const deadline = deadlineFor(monday, settings);
  return `${now.date}T${now.time}` >= `${deadline.date}T${deadline.time}`;
}

/** The weeks people can change one at a time: this week and next (decision 22). */
export function editableWeeks(today: IsoDate): { thisWeek: IsoDate; nextWeek: IsoDate } {
  const thisWeek = weekStart(today);
  return { thisWeek, nextWeek: addDays(thisWeek, 7) };
}
