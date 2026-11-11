import type { IsoDate } from "@/lib/dates";
import { hoursOf, overlaps } from "@/lib/schedule";

// The auto-scheduler (technical plan, section 5). A pure function: no database, no clock,
// so it's easy to test. Same input and seed → same schedule; a new seed (Regenerate)
// gives a different but equally fair one.

export type SchedulerShift = { id: string; date: IsoDate; startTime: string; endTime: string; requiredCount: number };
export type SchedulerPerson = {
  id: string;
  /** FAIR_SHARE people share the hours; BACKUP (the owner) only fills what's left. */
  mode: "FAIR_SHARE" | "BACKUP";
  /** Shifts this person is available for, the whole shift (hard rule 1). */
  available: Set<string>;
};
export type FixedAssignment = { shiftId: string; membershipId: string };
export type GeneratedAssignment = { shiftId: string; membershipId: string; covering: boolean };

export type SchedulerResult = {
  /** New assignments only (the fixed ones are kept as they are). */
  assignments: GeneratedAssignment[];
  unfilled: { shiftId: string; missing: number; reason: string }[];
  hours: Map<string, number>;
  targets: Map<string, number>;
};

/** Small, fast, seedable random numbers (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fair targets: each fair-share person's share of the hours, in proportion to how many
 * hours of this week's shifts they can work, and never more than that (section 5).
 * Hours already placed by hand on fair-share people count towards the total.
 */
export function fairTargets(shifts: SchedulerShift[], people: SchedulerPerson[], fixed: FixedAssignment[]): Map<string, number> {
  const fair = people.filter((p) => p.mode === "FAIR_SHARE");
  const byId = new Map(shifts.map((s) => [s.id, s]));
  const fairIds = new Set(fair.map((p) => p.id));

  const fixedOn = new Map<string, number>();
  for (const f of fixed) fixedOn.set(f.shiftId, (fixedOn.get(f.shiftId) ?? 0) + 1);
  let total = 0;
  for (const s of shifts) total += Math.max(0, s.requiredCount - (fixedOn.get(s.id) ?? 0)) * hoursOf(s);
  for (const f of fixed) {
    const s = byId.get(f.shiftId);
    if (s && fairIds.has(f.membershipId)) total += hoursOf(s);
  }

  const eligible = new Map(fair.map((p) => [p.id, shifts.filter((s) => p.available.has(s.id)).reduce((h, s) => h + hoursOf(s), 0)]));
  const sum = [...eligible.values()].reduce((a, b) => a + b, 0);
  return new Map(fair.map((p) => [p.id, sum ? Math.min(eligible.get(p.id)!, (total * eligible.get(p.id)!) / sum) : 0]));
}

export function generateSchedule(input: {
  shifts: SchedulerShift[];
  people: SchedulerPerson[];
  /** Pinned assignments: never moved (step 0). */
  fixed: FixedAssignment[];
  seed: number;
}): SchedulerResult {
  const { shifts, people, fixed } = input;
  const random = seededRandom(input.seed);
  const byId = new Map(shifts.map((s) => [s.id, s]));
  const fair = people.filter((p) => p.mode === "FAIR_SHARE");
  const backup = people.filter((p) => p.mode === "BACKUP");
  const targets = fairTargets(shifts, people, fixed);

  // Who is on what so far (fixed first).
  const onShift = new Map<string, Set<string>>(shifts.map((s) => [s.id, new Set()]));
  const shiftsOf = new Map<string, SchedulerShift[]>(people.map((p) => [p.id, []]));
  const hours = new Map<string, number>(people.map((p) => [p.id, 0]));
  const place = (shiftId: string, personId: string) => {
    const s = byId.get(shiftId)!;
    onShift.get(shiftId)!.add(personId);
    (shiftsOf.get(personId) ?? shiftsOf.set(personId, []).get(personId)!).push(s);
    hours.set(personId, (hours.get(personId) ?? 0) + hoursOf(s));
  };
  const unplace = (shiftId: string, personId: string) => {
    const s = byId.get(shiftId)!;
    onShift.get(shiftId)!.delete(personId);
    shiftsOf.set(personId, shiftsOf.get(personId)!.filter((x) => x.id !== shiftId));
    hours.set(personId, hours.get(personId)! - hoursOf(s));
  };
  for (const f of fixed) if (byId.has(f.shiftId)) place(f.shiftId, f.membershipId);

  /** Hard rules 1–3: available, not already on it, no overlap. */
  const canTake = (p: SchedulerPerson, s: SchedulerShift) =>
    p.available.has(s.id) && !onShift.get(s.id)!.has(p.id) && !shiftsOf.get(p.id)!.some((o) => overlaps(o, s));

  // Step 2: open slots, hardest first (fewest available people); seeded ties.
  const tie = new Map(shifts.map((s) => [s.id, random()]));
  const open = shifts
    .flatMap((s) => Array.from({ length: Math.max(0, s.requiredCount - onShift.get(s.id)!.size) }, () => s))
    .sort(
      (a, b) =>
        fair.filter((p) => p.available.has(a.id)).length - fair.filter((p) => p.available.has(b.id)).length ||
        tie.get(a.id)! - tie.get(b.id)!,
    );

  // Step 3: give each slot to the person furthest below their target.
  const auto: GeneratedAssignment[] = [];
  const empty: SchedulerShift[] = [];
  for (const s of open) {
    const candidates = fair.filter((p) => canTake(p, s));
    if (!candidates.length) {
      empty.push(s);
      continue;
    }
    const noise = new Map(candidates.map((p) => [p.id, random()]));
    const gap = (p: SchedulerPerson) => targets.get(p.id)! - hours.get(p.id)!;
    candidates.sort((a, b) => gap(b) - gap(a) || noise.get(a.id)! - noise.get(b.id)!);
    place(s.id, candidates[0].id);
    auto.push({ shiftId: s.id, membershipId: candidates[0].id, covering: false });
  }

  // Step 4: improvement pass. Move a generated shift to someone else when that
  // brings people closer to their targets (sum of squared gaps goes down).
  const cost = (id: string, h: number) => (h - targets.get(id)!) ** 2;
  for (let round = 0, improved = true; improved && round < 50; round++) {
    improved = false;
    for (const a of auto) {
      const s = byId.get(a.shiftId)!;
      const from = a.membershipId;
      const h = hoursOf(s);
      unplace(s.id, from);
      let best: { id: string; gain: number } | null = null;
      for (const p of fair) {
        if (p.id === from || !canTake(p, s)) continue;
        const gain =
          cost(from, hours.get(from)! + h) + cost(p.id, hours.get(p.id)!) - cost(from, hours.get(from)!) - cost(p.id, hours.get(p.id)! + h);
        if (gain > 1e-9 && (!best || gain > best.gain)) best = { id: p.id, gain };
      }
      a.membershipId = best?.id ?? from;
      place(s.id, a.membershipId);
      if (best) improved = true;
    }
  }

  // Step 5: the owner (backup) covers what's left, earliest first.
  empty.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  const stillEmpty: SchedulerShift[] = [];
  for (const s of empty) {
    const cover = backup.find((p) => canTake(p, s));
    if (cover) {
      place(s.id, cover.id);
      auto.push({ shiftId: s.id, membershipId: cover.id, covering: true });
    } else stillEmpty.push(s);
  }

  // Step 6: what's still unfilled, and why.
  const unfilled = new Map<string, { shiftId: string; missing: number; reason: string }>();
  for (const s of stillEmpty) {
    const entry = unfilled.get(s.id);
    if (entry) {
      entry.missing++;
      continue;
    }
    const anyone = people.some((p) => p.available.has(s.id) && !onShift.get(s.id)!.has(p.id));
    const backupFree = backup.some((p) => p.available.has(s.id));
    unfilled.set(s.id, {
      shiftId: s.id,
      missing: 1,
      reason: !anyone
        ? "nobody else is available"
        : backupFree
          ? "everyone available, including you, is already working then"
          : "everyone available is already working then",
    });
  }

  return { assignments: auto, unfilled: [...unfilled.values()], hours, targets };
}
