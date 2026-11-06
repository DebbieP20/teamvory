import { describe, expect, it } from "vitest";
import { type DaySetting, deadlineFor, describe as describeDay, editableWeeks, isWeekLocked, resolveDay, validateDay } from "./availability";

const template = new Map<number, DaySetting>([
  [1, { kind: "ALL_DAY" }],
  [2, { kind: "CUSTOM", startTime: "14:00", endTime: "21:00" }],
  [3, { kind: "OFF" }],
]);

describe("resolveDay", () => {
  it("uses the default week", () => {
    expect(resolveDay("2026-06-08", template, new Map(), [])).toMatchObject({ kind: "ALL_DAY", source: "default" });
  });
  it("lets a one-week change replace the default", () => {
    const overrides = new Map<string, DaySetting>([["2026-06-08", { kind: "OFF" }]]);
    expect(resolveDay("2026-06-08", template, overrides, [])).toMatchObject({ kind: "OFF", source: "change" });
    // ...only on that date
    expect(resolveDay("2026-06-15", template, overrides, [])).toMatchObject({ kind: "ALL_DAY", source: "default" });
  });
  it("puts time off above everything", () => {
    const overrides = new Map<string, DaySetting>([["2026-06-09", { kind: "ALL_DAY" }]]);
    const timeOff = [{ startDate: "2026-06-08", endDate: "2026-06-09", status: "APPROVED" as const }];
    expect(resolveDay("2026-06-09", template, overrides, timeOff)).toMatchObject({ kind: "OFF", source: "time-off" });
  });
  it("treats pending time off as unavailable, and ignores declined time off", () => {
    const pending = [{ startDate: "2026-06-08", endDate: "2026-06-08", status: "PENDING" as const }];
    expect(resolveDay("2026-06-08", template, new Map(), pending)).toMatchObject({ kind: "OFF", source: "pending-time-off" });
    const declined = [{ startDate: "2026-06-08", endDate: "2026-06-08", status: "DECLINED" as const }];
    expect(resolveDay("2026-06-08", template, new Map(), declined)).toMatchObject({ kind: "ALL_DAY", source: "default" });
  });
  it("says when nothing is set", () => {
    expect(resolveDay("2026-06-11", template, new Map(), [])).toMatchObject({ kind: "OFF", source: "not-set" });
  });
});

describe("describe and validateDay", () => {
  it("describes days in plain words", () => {
    expect(describeDay({ kind: "ALL_DAY" })).toBe("All day");
    expect(describeDay({ kind: "CUSTOM", startTime: "14:00", endTime: "21:00" })).toBe("2 PM – 9 PM");
    expect(describeDay({ kind: "OFF" })).toBe("Not available");
  });
  it("needs a start before the end for custom times", () => {
    expect(validateDay({ kind: "CUSTOM", startTime: "17:00", endTime: "12:00" })).toMatch(/after/);
    expect(validateDay({ kind: "CUSTOM", startTime: "17:00" })).toMatch(/Choose/);
    expect(validateDay({ kind: "CUSTOM", startTime: "12:00", endTime: "17:00" })).toBeNull();
    expect(validateDay({ kind: "OFF" })).toBeNull();
  });
});

describe("availability deadline", () => {
  const thursday6pm = { enabled: true, day: 4, time: "18:00" };

  it("falls on the chosen day of the week before", () => {
    // Week of Mon Jun 15 → deadline Thu Jun 11, 6 PM
    expect(deadlineFor("2026-06-15", thursday6pm)).toEqual({ date: "2026-06-11", time: "18:00" });
  });
  it("locks the week once the deadline has passed", () => {
    expect(isWeekLocked("2026-06-15", thursday6pm, { date: "2026-06-11", time: "17:59" })).toBe(false);
    expect(isWeekLocked("2026-06-15", thursday6pm, { date: "2026-06-11", time: "18:00" })).toBe(true);
    expect(isWeekLocked("2026-06-15", thursday6pm, { date: "2026-06-12", time: "09:00" })).toBe(true);
  });
  it("never locks when the deadline is turned off", () => {
    expect(isWeekLocked("2026-06-15", { ...thursday6pm, enabled: false }, { date: "2026-06-20", time: "09:00" })).toBe(false);
  });
});

describe("editableWeeks", () => {
  it("gives this week and next week only", () => {
    expect(editableWeeks("2026-06-10")).toEqual({ thisWeek: "2026-06-08", nextWeek: "2026-06-15" });
  });
});
