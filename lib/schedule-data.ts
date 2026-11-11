import "server-only";
import { editableWeeks } from "@/lib/availability";
import { getBusinessSettings, today } from "@/lib/availability-data";
import { addDays, fromDbDate, type IsoDate, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import type { PatternShift } from "@/lib/schedule";

/** "this" or "next" from ?week=, and the matching Monday (decision 22: two weeks only). */
export async function selectedWeek(businessId: string, param: string | string[] | undefined) {
  const settings = await getBusinessSettings(businessId);
  const now = today(settings);
  const weeks = editableWeeks(now.date);
  const selected = param === "next" ? ("next" as const) : ("this" as const);
  return { settings, now, weeks, selected, monday: selected === "next" ? weeks.nextWeek : weeks.thisWeek };
}

export async function findWeek(businessId: string, monday: IsoDate) {
  return db.week.findUnique({ where: { businessId_startDate: { businessId, startDate: toDbDate(monday) } } });
}

export async function getOrCreateWeek(businessId: string, monday: IsoDate) {
  return db.week.upsert({
    where: { businessId_startDate: { businessId, startDate: toDbDate(monday) } },
    create: { businessId, startDate: toDbDate(monday) },
    update: {},
  });
}

export type ShiftRow = { id: string; date: IsoDate; startTime: string; endTime: string; requiredCount: number };

export async function loadShifts(weekId: string | undefined): Promise<ShiftRow[]> {
  if (!weekId) return [];
  const shifts = await db.shift.findMany({ where: { weekId }, orderBy: [{ date: "asc" }, { startTime: "asc" }] });
  return shifts.map((s) => ({ id: s.id, date: fromDbDate(s.date), startTime: s.startTime, endTime: s.endTime, requiredCount: s.requiredCount }));
}

/** The week's draft schedule, created on first use. */
export async function getOrCreateDraft(weekId: string) {
  const existing = await db.schedule.findFirst({ where: { weekId, status: "DRAFT" } });
  if (existing) return existing;
  try {
    return await db.schedule.create({ data: { weekId, status: "DRAFT" } });
  } catch {
    // Someone else created it at the same moment (one draft per week is enforced by the database).
    return db.schedule.findFirstOrThrow({ where: { weekId, status: "DRAFT" } });
  }
}

export async function loadPatterns(businessId: string) {
  const patterns = await db.shiftPattern.findMany({ where: { businessId }, orderBy: { name: "asc" } });
  return patterns.map((p) => ({ id: p.id, name: p.name, shifts: p.shifts as PatternShift[] }));
}

/** Dates of the 7 days of the week starting `monday`. */
export const daysOf = (monday: IsoDate) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));
