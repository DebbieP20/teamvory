import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { overlaps } from "./schedule";
import { fairTargets, generateSchedule, type SchedulerPerson, type SchedulerShift } from "./scheduler";

// A Standard week: 12–5 and 5–9 every day, 2 people each (56 slots, 252 staff hours).
const MONDAY = "2026-11-16";
const week: SchedulerShift[] = Array.from({ length: 7 }, (_, d) => [
  { id: `d${d}-pm`, date: addDays(MONDAY, d), startTime: "12:00", endTime: "17:00", requiredCount: 2 },
  { id: `d${d}-ev`, date: addDays(MONDAY, d), startTime: "17:00", endTime: "21:00", requiredCount: 2 },
]).flat();
const all = new Set(week.map((s) => s.id));
const only = (pred: (s: SchedulerShift, day: number) => boolean) =>
  new Set(week.filter((s) => pred(s, Number(s.id.slice(1, 2)))).map((s) => s.id));

const person = (id: string, available: Set<string>, mode: SchedulerPerson["mode"] = "FAIR_SHARE"): SchedulerPerson => ({ id, mode, available });

/** Checks the hard rules on a result. */
function expectValid(shifts: SchedulerShift[], people: SchedulerPerson[], result: ReturnType<typeof generateSchedule>, fixed: { shiftId: string; membershipId: string }[] = []) {
  const byId = new Map(shifts.map((s) => [s.id, s]));
  const everyone = [...fixed, ...result.assignments];
  const seen = new Set<string>();
  for (const a of result.assignments) {
    const p = people.find((x) => x.id === a.membershipId)!;
    expect(p.available.has(a.shiftId), `${a.membershipId} available for ${a.shiftId}`).toBe(true);
  }
  for (const a of everyone) {
    const key = `${a.shiftId}:${a.membershipId}`;
    expect(seen.has(key), `twice on ${key}`).toBe(false);
    seen.add(key);
  }
  for (const p of people) {
    const mine = everyone.filter((a) => a.membershipId === p.id).map((a) => byId.get(a.shiftId)!);
    for (let i = 0; i < mine.length; i++) for (let j = i + 1; j < mine.length; j++) expect(overlaps(mine[i], mine[j])).toBe(false);
  }
  for (const s of shifts) expect(everyone.filter((a) => a.shiftId === s.id).length).toBeLessThanOrEqual(s.requiredCount);
}

describe("fairTargets", () => {
  it("is proportional to the hours each person can work", () => {
    // Ana can work everything (63 h), Ben only weekdays (45 h).
    const people = [person("ana", all), person("ben", only((_, d) => d < 5))];
    const t = fairTargets(week, people, []);
    expect(t.get("ana")! / t.get("ben")!).toBeCloseTo(63 / 45);
  });
  it("is never more than someone can actually work", () => {
    const people = [person("ana", all), person("eve", only((s, d) => d === 0 && s.startTime === "17:00"))];
    expect(fairTargets(week, people, []).get("eve")).toBe(4);
  });
  it("leaves the owner out of the fair split", () => {
    const t = fairTargets(week, [person("ana", all), person("owner", all, "BACKUP")], []);
    expect(t.has("owner")).toBe(false);
  });
});

describe("generateSchedule", () => {
  it("fills every slot when enough people are available, keeping the hard rules", () => {
    const people = ["ana", "ben", "cara", "dev", "eli"].map((id) => person(id, all));
    const result = generateSchedule({ shifts: week, people, fixed: [], seed: 1 });
    expect(result.assignments).toHaveLength(28);
    expect(result.unfilled).toEqual([]);
    expectValid(week, people, result);
    // Equal availability → hours within one shift of each other.
    const h = [...result.hours.values()];
    expect(Math.max(...h) - Math.min(...h)).toBeLessThanOrEqual(5);
  });

  it("only gives part-day people the shifts they can cover", () => {
    const evenings = only((s) => s.startTime === "17:00");
    const people = [person("ana", all), person("ben", all), person("carla", evenings)];
    const result = generateSchedule({ shifts: week, people, fixed: [], seed: 7 });
    expectValid(week, people, result);
    expect(result.assignments.filter((a) => a.membershipId === "carla").every((a) => evenings.has(a.shiftId))).toBe(true);
  });

  it("gets everyone close to their fair target", () => {
    const people = [
      person("ana", all),
      person("ben", only((_, d) => d < 5)),
      person("carla", only((s) => s.startTime === "17:00")),
      person("diego", only((_, d) => d >= 3)),
      person("emma", only((s, d) => [0, 2, 4].includes(d) && s.startTime === "12:00")),
    ];
    const result = generateSchedule({ shifts: week, people, fixed: [], seed: 3 });
    expectValid(week, people, result);
    for (const p of people) {
      expect(Math.abs(result.hours.get(p.id)! - result.targets.get(p.id)!), p.id).toBeLessThanOrEqual(5);
    }
  });

  it("keeps pinned shifts and builds around them", () => {
    const people = [person("ana", all), person("ben", all), person("owner", all, "BACKUP")];
    const fixed = [{ shiftId: "d0-pm", membershipId: "owner" }];
    const result = generateSchedule({ shifts: week, people, fixed, seed: 2 });
    expectValid(week, people, result, fixed);
    // Monday afternoon needs only one more person now.
    expect(result.assignments.filter((a) => a.shiftId === "d0-pm")).toHaveLength(1);
    expect(result.assignments.some((a) => a.shiftId === "d0-pm" && a.membershipId === "owner")).toBe(false);
  });

  it("uses the owner only for gaps nobody else can cover, marked as covering", () => {
    // Only one employee: the second spot on every shift goes to the owner.
    const people = [person("ana", all), person("owner", all, "BACKUP")];
    const result = generateSchedule({ shifts: week, people, fixed: [], seed: 4 });
    expectValid(week, people, result);
    const owner = result.assignments.filter((a) => a.membershipId === "owner");
    expect(owner).toHaveLength(14);
    expect(owner.every((a) => a.covering)).toBe(true);
    expect(result.assignments.filter((a) => a.membershipId === "ana").every((a) => !a.covering)).toBe(true);
  });

  it("reports what can't be filled, and why", () => {
    const people = [person("ana", only((_, d) => d !== 1)), person("owner", only((_, d) => d !== 1), "BACKUP")];
    const result = generateSchedule({ shifts: week, people, fixed: [], seed: 5 });
    const tuesday = result.unfilled.filter((u) => u.shiftId.startsWith("d1"));
    expect(tuesday).toEqual([
      { shiftId: "d1-pm", missing: 2, reason: "nobody else is available" },
      { shiftId: "d1-ev", missing: 2, reason: "nobody else is available" },
    ]);
  });

  it("never double-books overlapping shifts", () => {
    const shifts = [
      { id: "a", date: MONDAY, startTime: "12:00", endTime: "17:00", requiredCount: 1 },
      { id: "b", date: MONDAY, startTime: "16:00", endTime: "20:00", requiredCount: 1 },
    ];
    const people = [person("ana", new Set(["a", "b"]))];
    const result = generateSchedule({ shifts, people, fixed: [], seed: 1 });
    expect(result.assignments).toHaveLength(1);
    expect(result.unfilled).toEqual([{ shiftId: expect.any(String), missing: 1, reason: "everyone available is already working then" }]);
  });

  it("is repeatable with the same seed and varies with another", () => {
    const people = ["ana", "ben", "cara", "dev", "eli"].map((id) => person(id, all));
    const run = (seed: number) => generateSchedule({ shifts: week, people, fixed: [], seed }).assignments.map((a) => `${a.shiftId}:${a.membershipId}`).sort();
    expect(run(11)).toEqual(run(11));
    expect(run(11)).not.toEqual(run(12));
  });

  it("is fast for a typical week", () => {
    const people = Array.from({ length: 10 }, (_, i) => person(`p${i}`, all));
    const start = performance.now();
    generateSchedule({ shifts: week, people, fixed: [], seed: 9 });
    expect(performance.now() - start).toBeLessThan(200);
  });
});
