import { describe, expect, it } from "vitest";
import { TIME_OPTIONS, addDays, dayOfWeek, formatTime, formatWeek, nowInZone, weekDates, weekStart } from "./dates";

describe("nowInZone", () => {
  it("uses the business's time zone, not the server's", () => {
    // 3:30 AM UTC on Jun 9 is still 11:30 PM on Jun 8 in New York (EDT).
    expect(nowInZone("America/New_York", new Date("2026-06-09T03:30:00Z"))).toEqual({ date: "2026-06-08", time: "23:30" });
  });
  it("handles standard time in winter (EST)", () => {
    expect(nowInZone("America/New_York", new Date("2026-01-15T17:00:00Z"))).toEqual({ date: "2026-01-15", time: "12:00" });
  });
});

describe("weeks", () => {
  it("starts weeks on Monday", () => {
    expect(dayOfWeek("2026-06-08")).toBe(1); // Monday
    expect(dayOfWeek("2026-06-14")).toBe(7); // Sunday
    expect(weekStart("2026-06-14")).toBe("2026-06-08");
    expect(weekStart("2026-06-08")).toBe("2026-06-08");
  });
  it("crosses months and years", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(weekDates("2026-06-29")).toEqual(["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]);
  });
  it("adds days correctly across the daylight-saving change", () => {
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09");
  });
});

describe("formatting", () => {
  it("formats weeks", () => {
    expect(formatWeek("2026-06-08")).toBe("Jun 8 – 14");
    expect(formatWeek("2026-06-29")).toBe("Jun 29 – Jul 5");
  });
  it("formats times", () => {
    expect(formatTime("12:00")).toBe("12 PM");
    expect(formatTime("17:30")).toBe("5:30 PM");
    expect(formatTime("09:00")).toBe("9 AM");
  });
  it("offers half-hour times from 5 AM to 11:30 PM", () => {
    expect(TIME_OPTIONS[0]).toBe("05:00");
    expect(TIME_OPTIONS.at(-1)).toBe("23:30");
    expect(TIME_OPTIONS).toContain("17:30");
  });
});
