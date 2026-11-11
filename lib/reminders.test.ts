import { describe, expect, it } from "vitest";
import { describeReminderDays, isReminderDay, reminderEmail, reminderKind } from "./reminders";

const settings = { enabled: true, startDay: 3, days: 2, includeDefaultOnly: false }; // Wed + Thu

describe("isReminderDay", () => {
  it("is the start day and the days after it", () => {
    expect(isReminderDay(settings, "2026-11-10")).toBe(false); // Tue
    expect(isReminderDay(settings, "2026-11-11")).toBe(true); // Wed
    expect(isReminderDay(settings, "2026-11-12")).toBe(true); // Thu
    expect(isReminderDay(settings, "2026-11-13")).toBe(false); // Fri
  });
  it("never sends when turned off", () => {
    expect(isReminderDay({ ...settings, enabled: false }, "2026-11-11")).toBe(false);
  });
});

describe("reminderKind", () => {
  it("reminds only people who haven't set availability", () => {
    expect(reminderKind({ hasDefaultWeek: false, hasChangesNextWeek: false }, false)).toBe("missing");
    expect(reminderKind({ hasDefaultWeek: true, hasChangesNextWeek: false }, false)).toBeNull();
    expect(reminderKind({ hasDefaultWeek: false, hasChangesNextWeek: true }, false)).toBeNull();
  });
  it("with the extra option, also asks people on their default week to check", () => {
    expect(reminderKind({ hasDefaultWeek: true, hasChangesNextWeek: false }, true)).toBe("check");
    expect(reminderKind({ hasDefaultWeek: true, hasChangesNextWeek: true }, true)).toBeNull();
  });
});

it("describes the days", () => {
  expect(describeReminderDays({ startDay: 3, days: 2 })).toBe("Wednesday and Thursday");
  expect(describeReminderDays({ startDay: 5, days: 1 })).toBe("Friday");
  expect(describeReminderDays({ startDay: 1, days: 3 })).toBe("Monday, Tuesday and Wednesday");
});

describe("reminderEmail", () => {
  const base = { name: "Grace Kim", businessName: "Loren", nextMonday: "2026-11-16", link: "http://x/employee/availability" };
  it("mentions the deadline only when there is one", () => {
    const off = reminderEmail({ ...base, kind: "missing", deadline: { enabled: false, day: 4, time: "18:00" } });
    expect(off.subject).toBe("Reminder: add your availability for Nov 16 – 22");
    expect(off.text).not.toContain("due");
    const on = reminderEmail({ ...base, kind: "missing", deadline: { enabled: true, day: 4, time: "18:00" } });
    expect(on.text).toContain("It's due Thu, Nov 12 at 6 PM.");
  });
  it("asks default-week people to check", () => {
    expect(reminderEmail({ ...base, kind: "check", deadline: { enabled: false, day: 4, time: "18:00" } }).subject).toBe(
      "Is your availability for Nov 16 – 22 still right?",
    );
  });
});
