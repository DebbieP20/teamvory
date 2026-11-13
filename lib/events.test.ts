import { describe, expect, it } from "vitest";
import { validateEvent } from "./events";

const party = { title: "Private party", date: "2026-11-21", start: "18:00", end: "22:00", location: "", notes: "" };

describe("validateEvent", () => {
  it("accepts a normal event", () => {
    expect(validateEvent(party)).toBeNull();
  });
  it("explains each problem", () => {
    expect(validateEvent({ ...party, title: " " })).toEqual({ title: expect.stringMatching(/name/) });
    expect(validateEvent({ ...party, date: "" })).toEqual({ date: "Choose the date." });
    expect(validateEvent({ ...party, end: "17:00" })).toEqual({ time: "The end time must be after the start time." });
    expect(validateEvent({ ...party, start: "18:10" })).toEqual({ time: expect.stringMatching(/15-minute/) });
  });
});
