import { describe, expect, it } from "vitest";
import { createToken, sha256 } from "./tokens";

describe("tokens", () => {
  it("creates long, URL-safe, unique tokens", () => {
    const a = createToken();
    const b = createToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
  it("hashes the same way every time", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});
