import type { IsoDate } from "@/lib/dates";
import { describeShift, shortName } from "@/lib/schedule";

// Publishing (technical plan, section 3): the draft is the working copy, and each
// publish freezes it into a numbered version. The frozen copy keeps the shift times,
// so editing or deleting a shift afterwards never changes what the team was sent.

export type SnapshotPerson = { membershipId: string; name: string };
export type SnapshotShift = {
  shiftId: string;
  date: IsoDate;
  startTime: string;
  endTime: string;
  requiredCount: number;
  /** Set when the shift staffs an event (e.g. "Private party") */
  eventTitle?: string | null;
  people: SnapshotPerson[];
};
export type Snapshot = { shifts: SnapshotShift[] };

type DraftShift = { id: string; date: IsoDate; startTime: string; endTime: string; requiredCount: number; eventTitle?: string | null };
type DraftAssignment = { shiftId: string; membershipId: string; name: string };

export function buildSnapshot(shifts: DraftShift[], assignments: DraftAssignment[]): Snapshot {
  return {
    shifts: [...shifts]
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.endTime.localeCompare(b.endTime))
      .map((s) => ({
        shiftId: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        requiredCount: s.requiredCount,
        ...(s.eventTitle ? { eventTitle: s.eventTitle } : {}),
        people: assignments
          .filter((a) => a.shiftId === s.id)
          .map((a) => ({ membershipId: a.membershipId, name: a.name }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
  };
}

/** One person's shifts in a version, earliest first. */
export function shiftsFor(snapshot: Snapshot | null, membershipId: string): SnapshotShift[] {
  return (snapshot?.shifts ?? []).filter((s) => s.people.some((p) => p.membershipId === membershipId));
}

const key = (s: SnapshotShift) => `${s.date} ${s.startTime}-${s.endTime}`;

export type PersonChange = { added: SnapshotShift[]; removed: SnapshotShift[]; shifts: SnapshotShift[] };

/**
 * Whose shifts changed between two versions (a different day or time counts;
 * a coworker changing does not). Only these people are emailed on a re-publish.
 */
export function changesByPerson(before: Snapshot | null, after: Snapshot): Map<string, PersonChange> {
  const people = new Set<string>();
  for (const s of [...(before?.shifts ?? []), ...after.shifts]) for (const p of s.people) people.add(p.membershipId);

  const changes = new Map<string, PersonChange>();
  for (const id of people) {
    const was = shiftsFor(before, id);
    const now = shiftsFor(after, id);
    const wasKeys = new Set(was.map(key));
    const nowKeys = new Set(now.map(key));
    const added = now.filter((s) => !wasKeys.has(key(s)));
    const removed = was.filter((s) => !nowKeys.has(key(s)));
    if (added.length || removed.length) changes.set(id, { added, removed, shifts: now });
  }
  return changes;
}

/** True when the draft differs from what was published (any person, shift or count). */
export function hasUnpublishedChanges(published: Snapshot | null, draft: Snapshot): boolean {
  if (!published) return true;
  const flat = (s: Snapshot) =>
    JSON.stringify(s.shifts.map((x) => [key(x), x.requiredCount, x.people.map((p) => p.membershipId).sort()]));
  return flat(published) !== flat(draft);
}

/** "Mon, Nov 16, 12 PM – 5 PM, with Ana P. and Ben C." */
export function describeForEmail(shift: SnapshotShift, membershipId: string): string {
  const others = shift.people.filter((p) => p.membershipId !== membershipId).map((p) => shortName(p.name));
  const withWho = others.length ? `, with ${others.length > 1 ? `${others.slice(0, -1).join(", ")} and ${others.at(-1)}` : others[0]}` : "";
  return `${describeShift(shift)}${withWho}`;
}

/** Plain-text email for one person after a publish. */
export function scheduleEmail(opts: {
  name: string;
  businessName: string;
  week: string;
  firstPublish: boolean;
  change: PersonChange | null;
  shifts: SnapshotShift[];
  membershipId: string;
  link: string;
}): { subject: string; text: string } {
  const first = opts.name.split(" ")[0];
  const list = opts.shifts.length
    ? opts.shifts.map((s) => `• ${describeForEmail(s, opts.membershipId)}`).join("\n")
    : "You're not on the schedule this week.";

  if (opts.firstPublish || !opts.change) {
    return {
      subject: `Your schedule for ${opts.week}`,
      text: `Hi ${first},\n\n${opts.businessName} published the schedule for ${opts.week}.\n\nYour shifts:\n${list}\n\nSee it any time: ${opts.link}\n`,
    };
  }

  const lines = [
    ...opts.change.added.map((s) => `+ Added: ${describeShift(s)}`),
    ...opts.change.removed.map((s) => `− Removed: ${describeShift(s)}`),
  ].join("\n");
  return {
    subject: `Your schedule changed: ${opts.week}`,
    text: `Hi ${first},\n\n${opts.businessName} updated the schedule for ${opts.week}.\n\nWhat changed:\n${lines}\n\nYour shifts now:\n${list}\n\nSee it any time: ${opts.link}\n`,
  };
}



