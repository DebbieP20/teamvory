import type { Snapshot, SnapshotShift } from "@/lib/publish";
import { overlaps } from "@/lib/schedule";

// Swaps and open shifts (technical plan, section 6). Pure rules on a published
// snapshot, unit tested; lib/request-actions.ts applies them.

/** Can this person work the whole shift (availability, time off)? */
export type CanWork = (membershipId: string, shift: SnapshotShift) => boolean;

/** Not started yet, so it can still be swapped or picked up. */
export function isUpcoming(shift: Pick<SnapshotShift, "date" | "startTime">, now: { date: string; time: string }): boolean {
  return shift.date > now.date || (shift.date === now.date && shift.startTime > now.time);
}

const isOn = (shift: SnapshotShift, membershipId: string) => shift.people.some((p) => p.membershipId === membershipId);

/** Why someone can't take `shift` as well as their other shifts (null when they can). */
function takeProblem(snapshot: Snapshot, personId: string, shift: SnapshotShift, canWork: CanWork, giving?: SnapshotShift): string | null {
  if (isOn(shift, personId)) return "already on this shift";
  if (!canWork(personId, shift)) return "not available then";
  const clash = snapshot.shifts.find((s) => s.shiftId !== giving?.shiftId && s.shiftId !== shift.shiftId && isOn(s, personId) && overlaps(s, shift));
  return clash ? "already working then" : null;
}

/** Can `personId` pick up the open shift? Returns the reason if not. */
export function pickUpProblem(snapshot: Snapshot, shift: SnapshotShift, personId: string, canWork: CanWork): string | null {
  return takeProblem(snapshot, personId, shift, canWork);
}

/** Does a swap work for both people? Returns the reason if not. */
export function swapProblem(
  snapshot: Snapshot,
  a: { membershipId: string; shift: SnapshotShift },
  b: { membershipId: string; shift: SnapshotShift },
  canWork: CanWork,
): string | null {
  if (a.membershipId === b.membershipId) return "that's your own shift";
  if (a.shift.shiftId === b.shift.shiftId) return "you're on the same shift";
  if (!isOn(a.shift, a.membershipId) || !isOn(b.shift, b.membershipId)) return "the schedule changed";
  const forA = takeProblem(snapshot, a.membershipId, b.shift, canWork, a.shift);
  if (forA) return `you're ${forA}`;
  const forB = takeProblem(snapshot, b.membershipId, a.shift, canWork, b.shift);
  return forB ? `they're ${forB}` : null;
}

/** Coworker shifts the requester could swap `shift` for (wireframe 5C). */
export function swapOptions(
  snapshot: Snapshot,
  requesterId: string,
  shift: SnapshotShift,
  coworkers: Set<string>,
  canWork: CanWork,
  now: { date: string; time: string },
): { shift: SnapshotShift; membershipId: string; name: string }[] {
  return snapshot.shifts.flatMap((other) =>
    !isUpcoming(other, now)
      ? []
      : other.people
          .filter((p) => coworkers.has(p.membershipId))
          .filter((p) => !swapProblem(snapshot, { membershipId: requesterId, shift }, { membershipId: p.membershipId, shift: other }, canWork))
          .map((p) => ({ shift: other, membershipId: p.membershipId, name: p.name })),
  );
}

export type Move = { shiftId: string; from: string; to: { membershipId: string; name: string } };

/** The published copy after the moves (a swap is two moves, a pickup one). */
export function applyMoves(snapshot: Snapshot, moves: Move[]): Snapshot {
  return {
    shifts: snapshot.shifts.map((s) => {
      const mine = moves.filter((m) => m.shiftId === s.shiftId);
      if (!mine.length) return s;
      const people = s.people.map((p) => mine.find((m) => m.from === p.membershipId)?.to ?? p);
      return { ...s, people: [...people].sort((x, y) => x.name.localeCompare(y.name)) };
    }),
  };
}

/** Starts within the next 24 hours (the dashboard flags these open shifts). */
export function startsSoon(shift: Pick<SnapshotShift, "date" | "startTime">, now: { date: string; time: string }): boolean {
  if (!isUpcoming(shift, now)) return false;
  const tomorrow = new Date(`${now.date}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const next = tomorrow.toISOString().slice(0, 10);
  return shift.date === now.date || (shift.date === next && shift.startTime <= now.time);
}
