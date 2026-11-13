"use server";

import { randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { z } from "zod";
import { resolveDay } from "@/lib/availability";
import { loadWeek } from "@/lib/availability-data";
import { addDays, formatWeek, fromDbDate, type IsoDate, toDbDate, weekStart } from "@/lib/dates";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { errorState, type FormState } from "@/lib/form-state";
import { notify } from "@/lib/notifications";
import { changesByPerson, hasUnpublishedChanges, scheduleEmail, shiftsFor } from "@/lib/publish";
import { coversShift, DEFAULT_PATTERNS, describeShift, overlaps, type PatternShift, unavailableReason, validateShift } from "@/lib/schedule";
import {
  draftSnapshot,
  findWeek,
  getOrCreateDraft,
  getOrCreateWeek,
  loadPublished,
  loadSchedulingPeople,
  loadShifts,
  selectedWeek,
} from "@/lib/schedule-data";
import { generateSchedule } from "@/lib/scheduler";
import { requireManager } from "@/lib/session";
import { appUrl } from "@/lib/urls";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function manager() {
  const { membership } = await requireManager();
  return membership;
}

/** A shift in the manager's own business, or null. */
async function findShift(businessId: string, shiftId: string) {
  if (!z.uuid().safeParse(shiftId).success) return null;
  return db.shift.findFirst({ where: { id: shiftId, week: { businessId } }, include: { week: true } });
}

/** Only this week and next week can be set up (decision 22). */
async function checkEditableWeek(businessId: string, monday: IsoDate) {
  const { weeks } = await selectedWeek(businessId, undefined);
  return monday === weeks.thisWeek || monday === weeks.nextWeek;
}

function readShifts(formData: FormData): { shifts: PatternShift[]; error: string | null } {
  const starts = formData.getAll("start").map(String);
  const ends = formData.getAll("end").map(String);
  const required = formData.getAll("required").map((v) => Number(v));
  const shifts = starts.map((start, i) => ({ start, end: ends[i] ?? "", required: required[i] ?? 0 }));
  const error = shifts.map(validateShift).find(Boolean) ?? null;
  return { shifts, error };
}

// --- Patterns ------------------------------------------------------------------

export async function savePattern(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const name = String(formData.get("name") ?? "").trim();
  const patternId = String(formData.get("patternId") ?? "");
  if (patternId && !isUuid(patternId)) return errorState("That pattern no longer exists.");
  if (!name || name.length > 40) return errorState(undefined, { name: "Give the pattern a name (up to 40 characters)." });

  const { shifts, error } = readShifts(formData);
  if (!shifts.length) return errorState("Add at least one shift.");
  if (error) return errorState(error);

  const clash = await db.shiftPattern.findFirst({
    where: { businessId: membership.businessId, name, ...(patternId ? { id: { not: patternId } } : {}) },
  });
  if (clash) return errorState(undefined, { name: "You already have a pattern with this name." });

  const sorted = [...shifts].sort((a, b) => a.start.localeCompare(b.start));
  if (patternId) {
    const updated = await db.shiftPattern.updateMany({
      where: { id: patternId, businessId: membership.businessId },
      data: { name, shifts: sorted },
    });
    if (!updated.count) return errorState("That pattern no longer exists.");
  } else {
    await db.shiftPattern.create({ data: { businessId: membership.businessId, name, shifts: sorted } });
  }
  refresh();
  return { status: "success", message: `Pattern "${name}" saved.` };
}

export async function deletePattern(formData: FormData) {
  const membership = await manager();
  const patternId = formData.get("patternId");
  if (!isUuid(patternId)) return;
  await db.shiftPattern.deleteMany({ where: { id: patternId, businessId: membership.businessId } });
  refresh();
}

// --- Week setup ----------------------------------------------------------------

/** Replaces the ticked days' shifts with a pattern (e.g. "Slow day" on a rainy Tuesday). */
export async function applyPattern(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const monday = String(formData.get("monday"));
  const dates = formData.getAll("date").map(String);
  if (!isoDate.safeParse(monday).success || !(await checkEditableWeek(membership.businessId, monday))) {
    return errorState("You can only set up this week and next week.");
  }
  if (!dates.length) return errorState("Tick the days to apply the pattern to.");
  if (dates.some((d) => !isoDate.safeParse(d).success || weekStart(d) !== monday)) return errorState("Those days aren't in this week.");

  const patternId = formData.get("patternId");
  const pattern = isUuid(patternId) ? await db.shiftPattern.findFirst({ where: { id: patternId, businessId: membership.businessId } }) : null;
  if (!pattern) return errorState("Choose a pattern.");

  const week = await getOrCreateWeek(membership.businessId, monday);
  const shifts = pattern.shifts as PatternShift[];
  await db.$transaction([
    db.shift.deleteMany({ where: { weekId: week.id, date: { in: dates.map(toDbDate) } } }),
    db.shift.createMany({
      data: dates.flatMap((date) =>
        shifts.map((s) => ({ weekId: week.id, date: toDbDate(date), startTime: s.start, endTime: s.end, requiredCount: s.required })),
      ),
    }),
  ]);
  refresh();
  return { status: "success", message: `${pattern.name} applied to ${dates.length} day${dates.length === 1 ? "" : "s"}. Other days are unchanged.` };
}

/** Copies the previous week's shifts, day by day (the usual one-click start). */
export async function copyLastWeek(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const monday = String(formData.get("monday"));
  if (!isoDate.safeParse(monday).success || !(await checkEditableWeek(membership.businessId, monday))) {
    return errorState("You can only set up this week and next week.");
  }
  const previous = await db.week.findUnique({
    where: { businessId_startDate: { businessId: membership.businessId, startDate: toDbDate(addDays(monday, -7)) } },
    include: { shifts: true },
  });
  if (!previous?.shifts.length) return errorState("Last week has no shifts to copy. Apply a pattern instead.");

  const week = await getOrCreateWeek(membership.businessId, monday);
  await db.$transaction([
    db.shift.deleteMany({ where: { weekId: week.id } }),
    db.shift.createMany({
      data: previous.shifts.map((s) => ({
        weekId: week.id,
        date: toDbDate(addDays(fromDbDate(s.date), 7)),
        startTime: s.startTime,
        endTime: s.endTime,
        requiredCount: s.requiredCount,
        notes: s.notes,
      })),
    }),
  ]);
  refresh();
  return { status: "success", message: `Copied ${previous.shifts.length} shifts from last week.` };
}

export async function addShift(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const date = String(formData.get("date"));
  if (!isoDate.safeParse(date).success || !(await checkEditableWeek(membership.businessId, weekStart(date)))) {
    return errorState("You can only set up this week and next week.");
  }
  const { shifts, error } = readShifts(formData);
  if (error || !shifts[0]) return errorState(error ?? "Choose a start and end time.");

  const week = await getOrCreateWeek(membership.businessId, weekStart(date));
  const s = shifts[0];
  await db.shift.create({ data: { weekId: week.id, date: toDbDate(date), startTime: s.start, endTime: s.end, requiredCount: s.required } });
  refresh();
  return { status: "success", message: "Shift added." };
}

export async function updateShift(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const shift = await findShift(membership.businessId, String(formData.get("shiftId")));
  if (!shift) return errorState("That shift no longer exists.");
  if (!(await checkEditableWeek(membership.businessId, fromDbDate(shift.week.startDate)))) {
    return errorState("You can only change this week and next week.");
  }
  const { shifts, error } = readShifts(formData);
  if (error || !shifts[0]) return errorState(error ?? "Choose a start and end time.");

  const s = shifts[0];
  await db.shift.update({ where: { id: shift.id }, data: { startTime: s.start, endTime: s.end, requiredCount: s.required } });
  refresh();
  const assigned = await db.assignment.count({ where: { shiftId: shift.id, schedule: { status: "DRAFT" } } });
  if (assigned > s.required) {
    const extra = assigned - s.required;
    return {
      status: "success",
      message: `Shift saved. ${assigned} people are already assigned, so remove ${extra} on the Schedule.`,
    };
  }
  return { status: "success", message: "Shift saved." };
}

export async function deleteShift(formData: FormData) {
  const membership = await manager();
  const shift = await findShift(membership.businessId, String(formData.get("shiftId")));
  if (!shift || !(await checkEditableWeek(membership.businessId, fromDbDate(shift.week.startDate)))) return;
  await db.shift.delete({ where: { id: shift.id } }); // its assignments go too
  refresh();
}

// --- Assigning people ------------------------------------------------------------

export async function assignPerson(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const shift = await findShift(membership.businessId, String(formData.get("shiftId")));
  if (!shift) return errorState("That shift no longer exists.");
  const monday = fromDbDate(shift.week.startDate);
  if (!(await checkEditableWeek(membership.businessId, monday))) return errorState("You can only change this week and next week.");

  const personId = String(formData.get("membershipId"));
  const person = z.uuid().safeParse(personId).success
    ? await db.membership.findFirst({
        where: { id: personId, businessId: membership.businessId },
        include: { user: { select: { name: true } } },
      })
    : null;
  // Hard rules that are never overridden: inactive or not-scheduled people (technical plan, section 5).
  if (!person || person.status !== "ACTIVE" || person.schedulingMode === "NOT_SCHEDULED") {
    return errorState("That person can't be scheduled.");
  }

  const draft = await getOrCreateDraft(shift.weekId);
  const shiftTimes = { date: fromDbDate(shift.date), startTime: shift.startTime, endTime: shift.endTime };
  const theirShifts = await db.assignment.findMany({
    where: { scheduleId: draft.id, membershipId: person.id },
    include: { shift: true },
  });
  if (theirShifts.some((a) => a.shiftId === shift.id)) return errorState(`${person.user.name} is already on this shift.`);
  const onShift = await db.assignment.count({ where: { scheduleId: draft.id, shiftId: shift.id } });
  if (onShift >= shift.requiredCount) {
    return errorState(`This shift already has the ${shift.requiredCount} ${shift.requiredCount === 1 ? "person" : "people"} it needs. To add more, raise the number in Shift setup.`);
  }
  const clash = theirShifts.find((a) =>
    overlaps(shiftTimes, { date: fromDbDate(a.shift.date), startTime: a.shift.startTime, endTime: a.shift.endTime }),
  );
  if (clash) {
    return errorState(
      `${person.user.name} already works ${describeShift({ date: fromDbDate(clash.shift.date), startTime: clash.shift.startTime, endTime: clash.shift.endTime })}, which overlaps.`,
    );
  }

  // Marked not available? Only after the manager confirms they agreed (decision 20).
  const data = (await loadWeek([person.id], monday)).get(person.id)!;
  const day = resolveDay(shiftTimes.date, data.template, data.overrides, data.timeOff);
  const available = coversShift(day, shiftTimes);
  const confirmed = formData.get("override") === "yes";
  if (!available && !confirmed) {
    return errorState(`${person.user.name} isn't available (${unavailableReason(day)}). Confirm that you've agreed with them first.`);
  }

  await db.assignment.create({
    data: {
      scheduleId: draft.id,
      shiftId: shift.id,
      membershipId: person.id,
      override: !available,
      pinned: true, // placed by hand: Build and Regenerate keep it (unpin to let them change it)
      createdById: membership.id,
    },
  });
  refresh();
  return { status: "success", message: `${person.user.name} added to ${describeShift(shiftTimes)}.` };
}

async function findAssignment(businessId: string, assignmentId: string) {
  if (!z.uuid().safeParse(assignmentId).success) return null;
  return db.assignment.findFirst({
    where: { id: assignmentId, schedule: { status: "DRAFT", week: { businessId } } },
    include: { schedule: { include: { week: true } } },
  });
}

export async function removeAssignment(formData: FormData) {
  const membership = await manager();
  const assignment = await findAssignment(membership.businessId, String(formData.get("assignmentId")));
  if (!assignment) return;
  await db.assignment.delete({ where: { id: assignment.id } });
  refresh();
}

export async function togglePin(formData: FormData) {
  const membership = await manager();
  const assignment = await findAssignment(membership.businessId, String(formData.get("assignmentId")));
  if (!assignment) return;
  await db.assignment.update({ where: { id: assignment.id }, data: { pinned: !assignment.pinned } });
  refresh();
}

/** Adds the two default patterns for businesses created before patterns existed. */
export async function addDefaultPatterns() {
  const membership = await manager();
  await db.shiftPattern.createMany({
    data: DEFAULT_PATTERNS.map((p) => ({ businessId: membership.businessId, name: p.name, shifts: p.shifts })),
    skipDuplicates: true,
  });
  refresh();
}

// --- Publishing ------------------------------------------------------------------

/**
 * Freezes the draft into a new published version and emails the team: everyone on
 * the first publish, then only the people whose own shifts changed.
 */
export async function publishSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const monday = String(formData.get("monday"));
  if (!isoDate.safeParse(monday).success || !(await checkEditableWeek(membership.businessId, monday))) {
    return errorState("You can only publish this week and next week.");
  }
  const week = await findWeek(membership.businessId, monday);
  if (!week) return errorState("Set up the week's shifts first.");
  const [snapshot, previous] = await Promise.all([draftSnapshot(week.id), loadPublished(week.id)]);
  if (!snapshot.shifts.length) return errorState("Set up the week's shifts first.");
  if (previous && !hasUnpublishedChanges(previous.snapshot, snapshot)) {
    return errorState("Nothing has changed since you last published.");
  }

  let published;
  try {
    published = await db.$transaction(async (tx) => {
      if (previous) await tx.schedule.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
      return tx.schedule.create({
        data: {
          weekId: week.id,
          status: "PUBLISHED",
          version: (previous?.version ?? 0) + 1,
          snapshot,
          publishedAt: new Date(),
          publishedById: membership.id,
        },
      });
    });
  } catch {
    // Only one published version per week is allowed by the database.
    return errorState("Someone else published this week at the same moment. Reload the page and check.");
  }

  // Who to email.
  const changes = changesByPerson(previous?.snapshot ?? null, snapshot);
  const people = await db.membership.findMany({
    where: {
      businessId: membership.businessId,
      status: "ACTIVE",
      // Not the person publishing: they know already.
      ...(previous
        ? { id: { in: [...changes.keys()].filter((id) => id !== membership.id) } }
        : { id: { not: membership.id }, schedulingMode: { not: "NOT_SCHEDULED" as const } }),
    },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const weekLabel = formatWeek(monday);
  const sent = await notify(
    people.map((p) => {
      const email = scheduleEmail({
        name: p.user.name,
        businessName: membership.businessName,
        week: weekLabel,
        firstPublish: !previous,
        change: changes.get(p.id) ?? null,
        shifts: shiftsFor(snapshot, p.id),
        membershipId: p.id,
        link: `${appUrl()}/employee`,
      });
      return {
        businessId: membership.businessId,
        userId: p.user.id,
        type: previous ? ("schedule-changed" as const) : ("schedule-published" as const),
        dedupeKey: `publish:${published.id}:${p.id}`,
        to: p.user.email,
        ...email,
      };
    }),
  );

  refresh();
  const who =
    sent > 0
      ? `Emailed ${sent} ${sent === 1 ? "person" : "people"}.`
      : previous
        ? "No one else's shifts changed, so no emails were sent."
        : "Nobody else to email yet.";
  return { status: "success", message: `${previous ? `Version ${published.version} published` : "Published"}. ${who}` };
}

// --- Auto-scheduler ----------------------------------------------------------------

/**
 * Build schedule / Regenerate (section 5): keeps every pinned assignment, replaces the
 * rest with a fresh fair schedule. A new random seed each time gives a different mix.
 */
export async function buildSchedule(_prev: FormState, formData: FormData): Promise<FormState> {
  const membership = await manager();
  const monday = String(formData.get("monday"));
  if (!isoDate.safeParse(monday).success || !(await checkEditableWeek(membership.businessId, monday))) {
    return errorState("You can only build this week and next week.");
  }
  const week = await findWeek(membership.businessId, monday);
  const shifts = await loadShifts(week?.id);
  if (!week || !shifts.length) return errorState("Set up the week's shifts first.");

  const [{ people }, draft] = await Promise.all([
    loadSchedulingPeople(membership.businessId, monday, shifts),
    getOrCreateDraft(week.id),
  ]);
  const kept = await db.assignment.findMany({ where: { scheduleId: draft.id, pinned: true }, select: { shiftId: true, membershipId: true } });
  const seed = randomInt(1, 2 ** 31 - 1);
  const result = generateSchedule({ shifts, people, fixed: kept, seed });

  await db.$transaction([
    db.assignment.deleteMany({ where: { scheduleId: draft.id, pinned: false } }),
    db.assignment.createMany({
      data: result.assignments.map((a) => ({
        scheduleId: draft.id,
        shiftId: a.shiftId,
        membershipId: a.membershipId,
        auto: true,
        covering: a.covering,
        createdById: membership.id,
      })),
    }),
    db.schedule.update({ where: { id: draft.id }, data: { seed } }),
  ]);
  refresh();

  const needed = shifts.reduce((n, s) => n + s.requiredCount, 0);
  const missing = result.unfilled.reduce((n, u) => n + u.missing, 0);
  const covering = result.assignments.filter((a) => a.covering);
  const coverers = [...new Set(covering.map((a) => a.membershipId))];
  const who = coverers.length === 1 && coverers[0] !== membership.id ? `${people.find((p) => p.id === coverers[0])!.name} covers` : "You're covering";
  const parts = [
    `Schedule built: ${needed - missing} of ${needed} spots filled.`,
    covering.length ? `${who} ${covering.length} ${covering.length === 1 ? "shift" : "shifts"} nobody else could.` : "",
    missing ? `${result.unfilled.length} ${result.unfilled.length === 1 ? "shift still needs" : "shifts still need"} people.` : "",
  ];
  return { status: "success", message: parts.filter(Boolean).join(" ") };
}
