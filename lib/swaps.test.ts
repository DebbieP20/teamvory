import { describe, expect, it } from "vitest";
import { buildSnapshot } from "./publish";
import { applyMoves, isUpcoming, pickUpProblem, startsSoon, swapOptions, swapProblem } from "./swaps";

const shifts = [
  { id: "mon-pm", date: "2026-11-16", startTime: "12:00", endTime: "17:00", requiredCount: 1 },
  { id: "mon-ev", date: "2026-11-16", startTime: "17:00", endTime: "21:00", requiredCount: 1 },
  { id: "mon-late", date: "2026-11-16", startTime: "16:00", endTime: "20:00", requiredCount: 1 },
  { id: "tue-ev", date: "2026-11-17", startTime: "17:00", endTime: "21:00", requiredCount: 1 },
];
const people = { ana: "Ana Pérez", ben: "Ben Carter", cara: "Cara Díaz" };
const on = (shiftId: string, id: keyof typeof people) => ({ shiftId, membershipId: id, name: people[id] });
const snap = buildSnapshot(shifts, [on("mon-pm", "ana"), on("mon-ev", "ben"), on("tue-ev", "cara")]);
const shift = (id: string) => snap.shifts.find((s) => s.shiftId === id)!;
const everyone = () => true;
const now = { date: "2026-11-15", time: "09:00" };

describe("isUpcoming", () => {
  it("is false once the shift has started", () => {
    expect(isUpcoming(shift("mon-pm"), now)).toBe(true);
    expect(isUpcoming(shift("mon-pm"), { date: "2026-11-16", time: "11:59" })).toBe(true);
    expect(isUpcoming(shift("mon-pm"), { date: "2026-11-16", time: "12:00" })).toBe(false);
  });
});

describe("pickUpProblem", () => {
  it("lets an available person with no clash pick it up", () => {
    expect(pickUpProblem(snap, shift("mon-pm"), "cara", everyone)).toBeNull();
  });
  it("blocks people already on it, unavailable, or working then", () => {
    expect(pickUpProblem(snap, shift("mon-pm"), "ana", everyone)).toBe("already on this shift");
    expect(pickUpProblem(snap, shift("mon-pm"), "cara", () => false)).toBe("not available then");
    expect(pickUpProblem(snap, shift("mon-late"), "ben", everyone)).toBe("already working then");
  });
});

describe("swapProblem", () => {
  const ana = { membershipId: "ana", shift: shift("mon-pm") };
  it("allows a swap that works for both", () => {
    expect(swapProblem(snap, ana, { membershipId: "cara", shift: shift("tue-ev") }, everyone)).toBeNull();
  });
  it("lets people trade back-to-back shifts on the same day", () => {
    // Ana gives 12–5 and takes 5–9; Ben the other way round. Nothing overlaps.
    expect(swapProblem(snap, ana, { membershipId: "ben", shift: shift("mon-ev") }, everyone)).toBeNull();
  });
  it("checks availability on both sides", () => {
    const anaOnlyAfternoons = (id: string, s: { startTime: string }) => id !== "ana" || s.startTime === "12:00";
    expect(swapProblem(snap, ana, { membershipId: "cara", shift: shift("tue-ev") }, anaOnlyAfternoons)).toBe("you're not available then");
    const caraNoMondays = (id: string, s: { date: string }) => id !== "cara" || s.date !== "2026-11-16";
    expect(swapProblem(snap, ana, { membershipId: "cara", shift: shift("tue-ev") }, caraNoMondays)).toBe("they're not available then");
  });
  it("notices when the schedule changed underneath", () => {
    expect(swapProblem(snap, ana, { membershipId: "ben", shift: shift("tue-ev") }, everyone)).toBe("the schedule changed");
  });
});

it("lists only coworker shifts that work for both", () => {
  const options = swapOptions(snap, "ana", shift("mon-pm"), new Set(["ben", "cara"]), (id, s) => id !== "cara" || s.date !== "2026-11-16", now);
  expect(options.map((o) => `${o.shift.shiftId}:${o.membershipId}`)).toEqual(["mon-ev:ben"]);
});

it("applies a swap to the published copy", () => {
  const after = applyMoves(snap, [
    { shiftId: "mon-pm", from: "ana", to: { membershipId: "cara", name: people.cara } },
    { shiftId: "tue-ev", from: "cara", to: { membershipId: "ana", name: people.ana } },
  ]);
  expect(after.shifts.find((s) => s.shiftId === "mon-pm")!.people.map((p) => p.membershipId)).toEqual(["cara"]);
  expect(after.shifts.find((s) => s.shiftId === "tue-ev")!.people.map((p) => p.membershipId)).toEqual(["ana"]);
  expect(after.shifts.find((s) => s.shiftId === "mon-ev")).toBe(snap.shifts.find((s) => s.shiftId === "mon-ev"));
});

it("flags shifts starting within 24 hours", () => {
  const at = { date: "2026-11-15", time: "18:00" };
  expect(startsSoon({ date: "2026-11-15", startTime: "19:00" }, at)).toBe(true);
  expect(startsSoon({ date: "2026-11-16", startTime: "12:00" }, at)).toBe(true);
  expect(startsSoon({ date: "2026-11-16", startTime: "19:00" }, at)).toBe(false);
  expect(startsSoon({ date: "2026-11-15", startTime: "17:00" }, at)).toBe(false); // already started
});
