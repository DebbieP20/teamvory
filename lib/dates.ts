// Calendar dates as "YYYY-MM-DD" strings and wall-clock times as "HH:mm",
// always in the business's time zone (docs/architecture.md, decision 3).
// Plain strings avoid time-zone surprises: Mon Jun 8 is Mon Jun 8 everywhere.

export type IsoDate = string; // "2026-06-08"

const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** The date and time right now in `timeZone`, e.g. { date: "2026-06-04", time: "14:30" }. */
export function nowInZone(timeZone: string, now: Date = new Date()): { date: IsoDate; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function toUtc(date: IsoDate): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date "${date}"`);
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toUtc(date).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** 1 = Monday ... 7 = Sunday. */
export function dayOfWeek(date: IsoDate): number {
  return ((toUtc(date).getUTCDay() + 6) % 7) + 1;
}

/** The Monday of the week `date` is in (weeks start on Monday, decision 14). */
export function weekStart(date: IsoDate): IsoDate {
  return addDays(date, 1 - dayOfWeek(date));
}

export function weekDates(monday: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / DAY_MS);
}

/** Prisma returns @db.Date columns as UTC midnight; convert both ways. */
export const fromDbDate = (d: Date): IsoDate => d.toISOString().slice(0, 10);
export const toDbDate = (date: IsoDate): Date => toUtc(date);

const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekdayMonthDay = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** "Jun 8" */
export const formatMonthDay = (date: IsoDate) => monthDay.format(toUtc(date));
/** "Mon, Jun 8" */
export const formatDay = (date: IsoDate) => weekdayMonthDay.format(toUtc(date));
/** "Jun 8 – 14" or "Jun 29 – Jul 5" */
export function formatWeek(monday: IsoDate): string {
  const end = addDays(monday, 6);
  const sameMonth = monday.slice(5, 7) === end.slice(5, 7);
  return `${formatMonthDay(monday)} – ${sameMonth ? end.slice(8).replace(/^0/, "") : formatMonthDay(end)}`;
}

/** "14:00" → "2 PM", "17:30" → "5:30 PM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Choices for time pickers, every 30 minutes from 5 AM to 11:30 PM. */
export const TIME_OPTIONS: string[] = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/** "14:00" → "2:00 PM", always with minutes (for time boxes). */
export function formatTimeFull(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** Every quarter hour of the day: "00:00", "00:15" ... "23:45". */
export const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, i) => {
  const minutes = i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

/**
 * Understands times the way people type them and returns "HH:mm", or null.
 * "12:15 pm", "12:15pm", "1215p", "2pm", "2 PM", "14:30", "1430", "9.45am".
 * Without AM/PM, 1–6 means afternoon (a typical work day), 7–11 morning, 12 noon.
 */
/**
 * Could `text` still become a time while someone types it? ("2", "2:1", "2:15 p", "1430").
 * Anything else is ignored by the time box, so nothing can be typed after "PM".
 */
export function isTimeTyping(text: string): boolean {
  return text.length <= 8 && /^(\d{1,2}(:\d{0,2})?|\d{3,4})?\s?([ap]m?)?$/i.test(text);
}

export function parseTimeInput(input: string): string | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, "").replace(/\./g, ":");
  const match = /^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/.exec(text);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const suffix = match[3]?.[0];
  if (minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === "a") hour = hour === 12 ? 0 : hour;
    else hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) {
    return null;
  } else if (hour >= 1 && hour <= 6 && !match[1].startsWith("0")) {
    // No AM/PM: guess like a person would for work hours. 24-hour times
    // ("14:30") and times with a leading zero ("02:30") are taken as written.
    hour += 12;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
