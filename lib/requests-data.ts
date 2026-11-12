import "server-only";
import { fromDbDate, type IsoDate } from "@/lib/dates";
import { db } from "@/lib/db";
import type { SnapshotShift } from "@/lib/publish";
import { findWeek, loadPublished, loadSchedulingPeople, selectedWeek } from "@/lib/schedule-data";
import { type CanWork, isUpcoming } from "@/lib/swaps";

/**
 * A published week with what swaps and pickups need: the snapshot, who can work
 * which shift, and who counts as a coworker (employees, not the owner or managers).
 */
export async function publishedWeek(businessId: string, monday: IsoDate) {
  const week = await findWeek(businessId, monday);
  const published = await loadPublished(week?.id);
  if (!week || !published) return null;
  const shifts = published.snapshot.shifts.map((s) => ({ ...s, id: s.shiftId }));
  const { people } = await loadSchedulingPeople(businessId, monday, shifts);
  const canWork: CanWork = (membershipId, shift) => !!people.find((p) => p.id === membershipId)?.available.has(shift.shiftId);
  const employees = people.filter((p) => p.role === "EMPLOYEE");
  return { week, monday, published, snapshot: published.snapshot, people, employees, canWork };
}

export type PublishedWeek = NonNullable<Awaited<ReturnType<typeof publishedWeek>>>;

/** This week and next week, where published. */
export async function publishedWeeks(businessId: string) {
  const { now, weeks } = await selectedWeek(businessId, undefined);
  const found = await Promise.all([weeks.thisWeek, weeks.nextWeek].map((m) => publishedWeek(businessId, m)));
  return { now, weeks: found.filter((w): w is PublishedWeek => !!w) };
}

export const findShift = (week: PublishedWeek, shiftId: string | null | undefined): SnapshotShift | undefined =>
  week.snapshot.shifts.find((s) => s.shiftId === shiftId);

/**
 * Active requests (open or waiting for approval) for this week and next, with their
 * shifts from the published copy. Requests whose shift has started, or that no longer
 * match the published schedule, are left out (they can't go ahead any more).
 */
export async function activeRequests(businessId: string) {
  const { now, weeks } = await publishedWeeks(businessId);
  const rows = await db.shiftRequest.findMany({
    where: { businessId, status: { in: ["OPEN", "PENDING_APPROVAL"] }, weekId: { in: weeks.map((w) => w.week.id) } },
    include: {
      requester: { include: { user: { select: { name: true } } } },
      targetMembership: { include: { user: { select: { name: true } } } },
      pickedUpBy: { include: { user: { select: { name: true } } } },
      week: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return {
    now,
    weeks,
    requests: rows.flatMap((r) => {
      const week = weeks.find((w) => w.week.id === r.weekId)!;
      const shift = findShift(week, r.shiftId);
      const targetShift = findShift(week, r.targetShiftId);
      const stillOn = (s: SnapshotShift | undefined, id: string | null) => !!s && !!id && s.people.some((p) => p.membershipId === id);
      if (!shift || !isUpcoming(shift, now) || !stillOn(shift, r.requesterId)) return [];
      if (r.type === "SWAP" && (!targetShift || !isUpcoming(targetShift, now) || !stillOn(targetShift, r.targetMembershipId))) return [];
      return [{ ...r, monday: fromDbDate(r.week.startDate), shift, targetShift: targetShift ?? null, publishedWeek: week }];
    }),
  };
}

export type ActiveRequest = Awaited<ReturnType<typeof activeRequests>>["requests"][number];
