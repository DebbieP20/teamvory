import "server-only";
import { getBusinessSettings } from "@/lib/availability-data";
import { addDays, formatDay, formatTime, formatWeek, type IsoDate, WEEKDAYS_SHORT } from "@/lib/dates";
import type { Snapshot } from "@/lib/publish";
import { hoursOf, timeRows } from "@/lib/schedule";
import { draftSnapshot, findWeek, loadEvents, loadPublished } from "@/lib/schedule-data";

// What every export format shows (decision 12): the week grid, hours per person, and events.
// The published version is exported when there is one (what the team saw); otherwise the draft.

export type ExportCell = { people: string[]; required: number; eventTitle: string | null } | null;
export type ExportData = {
  businessName: string;
  monday: IsoDate;
  week: string;
  status: string;
  days: { date: IsoDate; short: string; label: string }[];
  rows: { label: string; cells: ExportCell[] }[];
  hours: { name: string; shifts: number; hours: number }[];
  events: { day: string; title: string; time: string; location: string | null }[];
};

export async function exportData(businessId: string, monday: IsoDate): Promise<ExportData | null> {
  const week = await findWeek(businessId, monday);
  if (!week) return null;
  const [settings, published, events] = await Promise.all([
    getBusinessSettings(businessId),
    loadPublished(week.id),
    loadEvents(businessId, monday, addDays(monday, 6)),
  ]);
  const snapshot: Snapshot = published?.snapshot ?? (await draftSnapshot(week.id));
  if (!snapshot.shifts.length) return null;

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((date, i) => ({
    date,
    short: `${WEEKDAYS_SHORT[i]} ${Number(date.slice(8))}`,
    label: formatDay(date),
  }));
  const rows = timeRows(snapshot.shifts).map((row) => ({
    label: `${formatTime(row.startTime)} – ${formatTime(row.endTime)}`,
    cells: days.map(({ date }) => {
      const matches = snapshot.shifts.filter((s) => s.date === date && s.startTime === row.startTime && s.endTime === row.endTime);
      if (!matches.length) return null;
      return {
        people: matches.flatMap((s) => s.people.map((p) => p.name)),
        required: matches.reduce((n, s) => n + s.requiredCount, 0),
        eventTitle: matches.find((s) => s.eventTitle)?.eventTitle ?? null,
      };
    }),
  }));

  const hours = new Map<string, { name: string; shifts: number; hours: number }>();
  for (const s of snapshot.shifts) {
    for (const p of s.people) {
      const h = hours.get(p.membershipId) ?? { name: p.name, shifts: 0, hours: 0 };
      h.shifts++;
      h.hours += hoursOf(s);
      hours.set(p.membershipId, h);
    }
  }

  const publishedOn = published?.publishedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: settings.timezone }).format(published.publishedAt)
    : null;
  return {
    businessName: settings.name,
    monday,
    week: formatWeek(monday),
    status: published ? `Published ${publishedOn} (version ${published.version})` : "Draft, not published yet",
    days,
    rows,
    hours: [...hours.values()].sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name)),
    events: events.map((e) => ({
      day: formatDay(e.date),
      title: e.title,
      time: `${formatTime(e.startTime)} – ${formatTime(e.endTime)}`,
      location: e.location,
    })),
  };
}

/** "Ana Pérez, Ben Carter" plus how many are still missing. */
export function cellText(cell: ExportCell): string {
  if (!cell) return "";
  const missing = cell.required - cell.people.length;
  return [cell.eventTitle ? `(${cell.eventTitle})` : "", ...cell.people, missing > 0 ? `${missing} needed` : ""].filter(Boolean).join("\n");
}

export const fmtHours = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
