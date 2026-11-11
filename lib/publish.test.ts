import { describe, expect, it } from "vitest";
import { buildSnapshot, changesByPerson, describeForEmail, hasUnpublishedChanges, scheduleEmail, shiftsFor } from "./publish";

const shifts = [
  { id: "s2", date: "2026-11-16", startTime: "17:00", endTime: "21:00", requiredCount: 2 },
  { id: "s1", date: "2026-11-16", startTime: "12:00", endTime: "17:00", requiredCount: 2 },
  { id: "s3", date: "2026-11-17", startTime: "17:00", endTime: "21:00", requiredCount: 1 },
];
const ana = { membershipId: "ana", name: "Ana Pérez" };
const ben = { membershipId: "ben", name: "Ben Carter" };
const on = (shiftId: string, p: typeof ana) => ({ shiftId, ...p });

describe("buildSnapshot", () => {
  it("orders shifts by day and time and lists who is on each", () => {
    const snap = buildSnapshot(shifts, [on("s1", ben), on("s1", ana), on("s3", ana)]);
    expect(snap.shifts.map((s) => s.shiftId)).toEqual(["s1", "s2", "s3"]);
    expect(snap.shifts[0].people.map((p) => p.name)).toEqual(["Ana Pérez", "Ben Carter"]);
    expect(shiftsFor(snap, "ana").map((s) => s.shiftId)).toEqual(["s1", "s3"]);
  });
});

describe("changesByPerson", () => {
  const v1 = buildSnapshot(shifts, [on("s1", ana), on("s2", ben), on("s3", ana)]);

  it("is empty when nothing changed for anyone", () => {
    expect(changesByPerson(v1, v1).size).toBe(0);
  });

  it("only includes people whose own shifts changed", () => {
    // Rain on Tuesday: Ana comes off Tuesday evening. Ben is untouched.
    const v2 = buildSnapshot(shifts, [on("s1", ana), on("s2", ben)]);
    const changes = changesByPerson(v1, v2);
    expect([...changes.keys()]).toEqual(["ana"]);
    expect(changes.get("ana")!.removed.map((s) => s.shiftId)).toEqual(["s3"]);
    expect(changes.get("ana")!.added).toEqual([]);
  });

  it("counts a new time on the same shift as a change", () => {
    const later = shifts.map((s) => (s.id === "s2" ? { ...s, startTime: "18:00" } : s));
    const changes = changesByPerson(v1, buildSnapshot(later, [on("s1", ana), on("s2", ben), on("s3", ana)]));
    expect([...changes.keys()]).toEqual(["ben"]);
    expect(changes.get("ben")!.added[0].startTime).toBe("18:00");
  });

  it("treats everyone as new on the first publish", () => {
    expect([...changesByPerson(null, v1).keys()].sort()).toEqual(["ana", "ben"]);
  });
});

describe("hasUnpublishedChanges", () => {
  const v1 = buildSnapshot(shifts, [on("s1", ana)]);
  it("notices people, times and the number needed", () => {
    expect(hasUnpublishedChanges(null, v1)).toBe(true);
    expect(hasUnpublishedChanges(v1, buildSnapshot(shifts, [on("s1", ana)]))).toBe(false);
    expect(hasUnpublishedChanges(v1, buildSnapshot(shifts, [on("s1", ben)]))).toBe(true);
    const fewer = shifts.map((s) => (s.id === "s1" ? { ...s, requiredCount: 1 } : s));
    expect(hasUnpublishedChanges(v1, buildSnapshot(fewer, [on("s1", ana)]))).toBe(true);
  });
});

describe("emails", () => {
  const snap = buildSnapshot(shifts, [on("s1", ana), on("s1", ben), on("s3", ana)]);

  it("names coworkers, never the person themselves", () => {
    expect(describeForEmail(snap.shifts[0], "ana")).toBe("Mon, Nov 16, 12 PM – 5 PM, with Ben C.");
    expect(describeForEmail(snap.shifts[2], "ana")).toBe("Tue, Nov 17, 5 PM – 9 PM");
  });

  it("lists the shifts on first publish, and what changed after", () => {
    const base = { name: "Ana Pérez", businessName: "Loren", week: "Nov 16 – 22", membershipId: "ana", link: "http://x/employee" };
    const first = scheduleEmail({ ...base, firstPublish: true, change: null, shifts: shiftsFor(snap, "ana") });
    expect(first.subject).toBe("Your schedule for Nov 16 – 22");
    expect(first.text).toContain("• Tue, Nov 17, 5 PM – 9 PM");

    const v2 = buildSnapshot(shifts, [on("s1", ana), on("s1", ben)]);
    const change = changesByPerson(snap, v2).get("ana")!;
    const update = scheduleEmail({ ...base, firstPublish: false, change, shifts: change.shifts });
    expect(update.subject).toBe("Your schedule changed: Nov 16 – 22");
    expect(update.text).toContain("− Removed: Tue, Nov 17, 5 PM – 9 PM");
    expect(update.text).not.toContain("• Tue");
  });

  it("tells people with no shifts", () => {
    const email = scheduleEmail({
      name: "Grace Kim", businessName: "Loren", week: "Nov 16 – 22", membershipId: "grace", link: "x", firstPublish: true, change: null, shifts: [],
    });
    expect(email.text).toContain("You're not on the schedule this week.");
  });
});
