import { describe, expect, it } from "vitest";
import { shiftHours, toMinutes } from "./time";

describe("toMinutes", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("12:00")).toBe(720);
    expect(toMinutes("17:30")).toBe(1050);
  });

  it("rejects badly formatted times", () => {
    expect(() => toMinutes("9:00")).toThrow();
    expect(() => toMinutes("24:00")).toThrow();
    expect(() => toMinutes("noon")).toThrow();
  });
});

describe("shiftHours", () => {
  it("calculates the standard shifts", () => {
    expect(shiftHours("12:00", "17:00")).toBe(5);
    expect(shiftHours("17:00", "21:00")).toBe(4);
  });

  it("handles half hours", () => {
    expect(shiftHours("17:00", "20:30")).toBe(3.5);
  });

  it("rejects shifts that end before they start", () => {
    expect(() => shiftHours("21:00", "17:00")).toThrow();
    expect(() => shiftHours("17:00", "17:00")).toThrow();
  });
});
