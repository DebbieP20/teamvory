import { describe, expect, it } from "vitest";
import { describeReminderDays, isReminderDay, reminderEmail } from "./reminders";

const settings = { enabled: true, startDay: 3, days: 2 }; // Wed + Thu

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

it("describes the days", () => {
  expect(describeReminderDays({ startDay: 3, days: 2 })).toBe("Wednesday and Thursday");
  expect(describeReminderDays({ startDay: 5, days: 1 })).toBe("Friday");
  expect(describeReminderDays({ startDay: 1, days: 3 })).toBe("Monday, Tuesday and Wednesday");
});

describe("reminderEmail", () => {
  const base = { name: "Grace Kim", businessName: "Loren", nextMonday: "2026-11-16", link: "http://x/employee/availability" };
  it("mentions the deadline only when there is one", () => {
    const off = reminderEmail({ ...base, deadline: { enabled: false, day: 4, time: "18:00" } });
    expect(off.subject).toBe("Reminder: send your availability for Nov 16 – 22");
    expect(off.text).not.toContain("due");
    const on = reminderEmail({ ...base, deadline: { enabled: true, day: 4, time: "18:00" } });
    expect(on.text).toContain("It's due Thu, Nov 12 at 6 PM.");
  });
  it("links to the week and says what happens if they don't send it", () => {
    const email = reminderEmail({ ...base, deadline: { enabled: false, day: 4, time: "18:00" } });
    expect(email.html).toContain("http://x/employee/availability");
    expect(email.text).toContain("you won't be scheduled that week");
  });
});
