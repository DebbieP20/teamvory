import { type ResolvedDay, describe } from "@/lib/availability";
import { formatDay, formatTime, type IsoDate } from "@/lib/dates";
import { shiftHours } from "@/lib/time";

// Scheduling rules (technical plan, section 5). Pure functions, unit tested;
// the auto-scheduler in M6 will reuse them.

export type ShiftTimes = { date: IsoDate; startTime: string; endTime: string };
export type PatternShift = { start: string; end: string; required: number };

/** Can someone with this day's availability work the whole shift? */
export function coversShift(day: ResolvedDay, shift: ShiftTimes): boolean {
  if (day.kind === "ALL_DAY") return true;
  if (day.kind === "CUSTOM" && day.startTime && day.endTime) {
    return day.startTime <= shift.startTime && day.endTime >= shift.endTime;
  }
  return false;
}

/** Why someone can't work a shift, in plain words (for the assign list). */
export function unavailableReason(day: ResolvedDay): string {
  if (day.source === "time-off") return "Time off";
  if (day.source === "pending-time-off") return "Time off requested";
  if (day.source === "not-set") return "Availability not set";
  if (day.kind === "OFF") return "Not available that day";
  return `Only available ${describe(day)}`;
}

/** Two shifts on the same day that share any time (back-to-back is fine). */
export function overlaps(a: ShiftTimes, b: ShiftTimes): boolean {
  return a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

export function hoursOf(shift: Pick<ShiftTimes, "startTime" | "endTime">): number {
  return shiftHours(shift.startTime, shift.endTime);
}

/** "Tue, Jun 9, 5 PM – 9 PM" */
export function describeShift(shift: ShiftTimes): string {
  return `${formatDay(shift.date)}, ${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
}

/**
 * The rows of the weekly grid: one per distinct shift time across the week,
 * earliest first (e.g. 12–5 and 5–9). A day without that shift shows an empty cell.
 */
export function timeRows(shifts: Pick<ShiftTimes, "startTime" | "endTime">[]): { startTime: string; endTime: string }[] {
  const seen = new Map<string, { startTime: string; endTime: string }>();
  for (const s of shifts) seen.set(`${s.startTime}-${s.endTime}`, { startTime: s.startTime, endTime: s.endTime });
  return [...seen.values()].sort((a, b) => a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime));
}

/** The most people one shift can need (the People list goes 1–5). */
export const MAX_PEOPLE = 5;

/** Checks one shift for a pattern or the shift setup. Returns an error or null. */
export function validateShift(shift: { start: string; end: string; required: number }): string | null {
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!valid.test(shift.start) || !valid.test(shift.end)) return "Choose a start and end time.";
  if (Number(shift.start.slice(3)) % 15 || Number(shift.end.slice(3)) % 15) {
    return "Use 15-minute steps, like 2:00, 2:15, 2:30 or 2:45.";
  }
  if (shift.start >= shift.end) return "The end time must be after the start time.";
  if (!Number.isInteger(shift.required) || shift.required < 1 || shift.required > MAX_PEOPLE) {
    return `People needed must be between 1 and ${MAX_PEOPLE}.`;
  }
  return null;
}

/** The two patterns every new business starts with (decision 23); they can be edited or deleted. */
export const DEFAULT_PATTERNS: { name: string; shifts: PatternShift[] }[] = [
  {
    name: "Standard",
    shifts: [
      { start: "12:00", end: "17:00", required: 2 },
      { start: "17:00", end: "21:00", required: 2 },
    ],
  },
  {
    name: "Slow day",
    shifts: [
      { start: "12:00", end: "17:00", required: 1 },
      { start: "17:00", end: "21:00", required: 1 },
    ],
  },
];
