import { describe, expect, it } from "vitest";
import { safeNextPath } from "./urls";

describe("safeNextPath", () => {
  it("allows paths on this site", () => {
    expect(safeNextPath("/manager")).toBe("/manager");
    expect(safeNextPath("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });
  it("blocks other sites and odd values", () => {
    expect(safeNextPath("https://evil.example")).toBeNull();
    expect(safeNextPath("//evil.example")).toBeNull();
    expect(safeNextPath("/\\evil.example")).toBeNull();
    expect(safeNextPath("manager")).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath(["/manager"])).toBeNull();
  });
});
