import { describe, expect, it } from "vitest";
import { formatAddress, parseAddress, safeName, teamSenderName } from "./email-address";

describe("parseAddress", () => {
  it("reads a name and address", () => {
    expect(parseAddress("TeamVory <hello@teamvory.com>")).toEqual({ name: "TeamVory", address: "hello@teamvory.com" });
    expect(parseAddress('"Harbor Lane Café" <a@b.co>')).toEqual({ name: "Harbor Lane Café", address: "a@b.co" });
  });

  it("reads a bare address", () => {
    expect(parseAddress(" hello@teamvory.com ")).toEqual({ name: "", address: "hello@teamvory.com" });
  });
});

describe("formatAddress", () => {
  it("quotes the name, so commas and accents are safe", () => {
    expect(formatAddress({ name: "Smith, Jones & Co. via TeamVory", address: "a@b.co" })).toBe('"Smith, Jones & Co. via TeamVory" <a@b.co>');
    expect(formatAddress({ name: teamSenderName("Café Ñandú"), address: "a@b.co" })).toBe('"Café Ñandú via TeamVory" <a@b.co>');
  });

  it("drops characters that could break the header", () => {
    expect(safeName('Evil" <x@y.z>\r\nBcc: all@y.z')).toBe("Evil x@y.z Bcc: all@y.z");
    expect(formatAddress({ name: '"', address: "a@b.co" })).toBe("a@b.co");
  });
});
