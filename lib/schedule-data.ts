import "server-only";
import { editableWeeks, resolveDay } from "@/lib/availability";
import { getBusinessSettings, loadWeek, today } from "@/lib/availability-data";
import { addDays, fromDbDate, type IsoDate, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildSnapshot, type Snapshot, type SnapshotShift } from "@/lib/publish";
import { coversShift, type PatternShift, unavailableReason } from "@/lib/schedule";

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

/** The version the team can see for a week (null before the first publish). */
export async function loadPublished(weekId: string | undefined) {
  if (!weekId) return null;
  const schedule = await db.schedule.findFirst({ where: { weekId, status: "PUBLISHED" } });
  return schedule ? { ...schedule, snapshot: schedule.snapshot as Snapshot } : null;
}

/** The draft as it would be published right now. */
export async function draftSnapshot(weekId: string): Promise<Snapshot> {
  const [shifts, draft] = await Promise.all([
    loadShifts(weekId),
    db.schedule.findFirst({
      where: { weekId, status: "DRAFT" },
      include: { assignments: { include: { membership: { include: { user: { select: { name: true } } } } } } },
    }),
  ]);
  return buildSnapshot(
    shifts,
    (draft?.assignments ?? []).map((a) => ({ shiftId: a.shiftId, membershipId: a.membershipId, name: a.membership.user.name })),
  );
}

export type PublishedConflict = { scheduleId: string; membershipId: string; name: string; shift: SnapshotShift; reason: string };

/**
 * Published shifts (today onwards) that someone can no longer work because their
 * availability changed after publishing. The schedule never changes by itself (section 3).
 */
export async function publishedConflicts(businessId: string, onlyMembershipId?: string): Promise<PublishedConflict[]> {
  const { now, weeks } = await selectedWeek(businessId, undefined);
  const result: PublishedConflict[] = [];
  for (const monday of [weeks.thisWeek, weeks.nextWeek]) {
    const week = await findWeek(businessId, monday);
    const published = await loadPublished(week?.id);
    if (!published) continue;
    const upcoming = published.snapshot.shifts.filter((s) => s.date >= now.date);
    const ids = [...new Set(upcoming.flatMap((s) => s.people.map((p) => p.membershipId)))].filter(
      (id) => !onlyMembershipId || id === onlyMembershipId,
    );
    if (!ids.length) continue;
    const [availability, agreed] = await Promise.all([
      loadWeek(ids, monday),
      // Exceptions the manager agreed to aren't conflicts.
      db.assignment.findMany({
        where: { schedule: { weekId: week!.id, status: "DRAFT" }, override: true, membershipId: { in: ids } },
        select: { shiftId: true, membershipId: true },
      }),
    ]);
    const agreedKeys = new Set(agreed.map((a) => `${a.shiftId}:${a.membershipId}`));
    for (const shift of upcoming) {
      for (const p of shift.people) {
        const a = availability.get(p.membershipId);
        if (!a || agreedKeys.has(`${shift.shiftId}:${p.membershipId}`)) continue;
        const day = resolveDay(shift.date, a.template, a.overrides, a.timeOff);
        if (!coversShift(day, shift)) {
          result.push({ scheduleId: published.id, membershipId: p.membershipId, name: p.name, shift, reason: unavailableReason(day) });
        }
      }
    }
  }
  return result;
}

/**
 * Everyone who can be scheduled this week, with the shifts each can work in full
 * (hard rules 1 and 4). Used by the Schedule page and the auto-scheduler.
 */
export async function loadSchedulingPeople(businessId: string, monday: IsoDate, shifts: ShiftRow[]) {
  const members = await db.membership.findMany({
    where: { businessId, status: "ACTIVE", schedulingMode: { not: "NOT_SCHEDULED" } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const availability = await loadWeek(members.map((m) => m.id), monday);
  const dayFor = (membershipId: string, date: IsoDate) => {
    const a = availability.get(membershipId);
    return a ? resolveDay(date, a.template, a.overrides, a.timeOff) : null;
  };
  const people = members.map((m) => ({
    id: m.id,
    name: m.user.name,
    role: m.role,
    mode: m.schedulingMode === "BACKUP" ? ("BACKUP" as const) : ("FAIR_SHARE" as const),
    available: new Set(
      shifts.filter((s) => {
        const day = dayFor(m.id, s.date);
        return !!day && coversShift(day, s);
      }).map((s) => s.id),
    ),
  }));
  return { people, dayFor };
}
