import { describe, expect, it } from "vitest";
import type { ResolvedDay } from "./availability";
import { coversShift, describeShift, overlaps, timeRows, unavailableReason, validateShift } from "./schedule";

const evening = { date: "2026-06-09", startTime: "17:00", endTime: "21:00" };
const day = (d: Partial<ResolvedDay>): ResolvedDay => ({ kind: "OFF", source: "default", ...d });

describe("coversShift", () => {
  it("is true for all-day availability", () => {
    expect(coversShift(day({ kind: "ALL_DAY" }), evening)).toBe(true);
  });
  it("needs custom times to cover the whole shift", () => {
    expect(coversShift(day({ kind: "CUSTOM", startTime: "14:00", endTime: "21:00" }), evening)).toBe(true);
    expect(coversShift(day({ kind: "CUSTOM", startTime: "17:00", endTime: "21:00" }), evening)).toBe(true);
    expect(coversShift(day({ kind: "CUSTOM", startTime: "17:00", endTime: "20:00" }), evening)).toBe(false);
    expect(coversShift(day({ kind: "CUSTOM", startTime: "18:00", endTime: "21:00" }), evening)).toBe(false);
  });
  it("is false when off or on time off", () => {
    expect(coversShift(day({ kind: "OFF" }), evening)).toBe(false);
    expect(coversShift(day({ kind: "OFF", source: "time-off" }), evening)).toBe(false);
  });
});

describe("unavailableReason", () => {
  it("explains why in plain words", () => {
    expect(unavailableReason(day({ source: "time-off" }))).toBe("Time off");
    expect(unavailableReason(day({ source: "not-set" }))).toBe("Availability not set");
    expect(unavailableReason(day({ kind: "OFF" }))).toBe("Not available that day");
    expect(unavailableReason(day({ kind: "CUSTOM", startTime: "12:00", endTime: "17:00" }))).toBe("Only available 12 PM – 5 PM");
  });
});

describe("overlaps", () => {
  const afternoon = { date: "2026-06-09", startTime: "12:00", endTime: "17:00" };
  it("allows back-to-back shifts", () => {
    expect(overlaps(afternoon, evening)).toBe(false);
  });
  it("catches shared time on the same day", () => {
    expect(overlaps(afternoon, { ...evening, startTime: "16:00" })).toBe(true);
    expect(overlaps(afternoon, { ...afternoon, startTime: "13:00", endTime: "14:00" })).toBe(true);
  });
  it("ignores other days", () => {
    expect(overlaps(afternoon, { ...afternoon, date: "2026-06-10" })).toBe(false);
  });
});

describe("timeRows", () => {
  it("lists each shift time once, earliest first", () => {
    const shifts = [
      { startTime: "17:00", endTime: "21:00" },
      { startTime: "12:00", endTime: "17:00" },
      { startTime: "17:00", endTime: "21:00" },
      { startTime: "12:00", endTime: "15:00" },
    ];
    expect(timeRows(shifts)).toEqual([
      { startTime: "12:00", endTime: "15:00" },
      { startTime: "12:00", endTime: "17:00" },
      { startTime: "17:00", endTime: "21:00" },
    ]);
  });
});

describe("validateShift", () => {
  it("accepts a normal shift", () => {
    expect(validateShift({ start: "12:00", end: "17:00", required: 2 })).toBeNull();
  });
  it("rejects bad shifts with a clear message", () => {
    expect(validateShift({ start: "17:00", end: "12:00", required: 2 })).toMatch(/after/);
    expect(validateShift({ start: "12:10", end: "17:00", required: 2 })).toMatch(/15-minute/);
    expect(validateShift({ start: "12:00", end: "17:00", required: 0 })).toMatch(/between 1 and 50/);
  });
});

it("describes a shift", () => {
  expect(describeShift(evening)).toBe("Tue, Jun 9, 5 PM – 9 PM");
});
