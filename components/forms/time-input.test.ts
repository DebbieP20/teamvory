import { describe, expect, it } from "vitest";
import { roundToQuarter } from "./time-input";

describe("roundToQuarter", () => {
  it("snaps to the nearest quarter hour", () => {
    expect(roundToQuarter("09:10")).toBe("09:15");
    expect(roundToQuarter("09:07")).toBe("09:00");
    expect(roundToQuarter("09:08")).toBe("09:15");
    expect(roundToQuarter("17:53")).toBe("18:00");
  });

  it("leaves quarter hours alone", () => {
    expect(roundToQuarter("00:00")).toBe("00:00");
    expect(roundToQuarter("12:45")).toBe("12:45");
  });

  it("never goes past 23:45", () => {
    expect(roundToQuarter("23:58")).toBe("23:45");
  });

  it("returns empty or odd values unchanged", () => {
    expect(roundToQuarter("")).toBe("");
    expect(roundToQuarter("9:10")).toBe("9:10");
  });
});
