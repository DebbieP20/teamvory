import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact";

const valid = { name: "Ana Pérez", email: "ana@example.com", message: "Do you support two locations?", website: "" };

describe("contactSchema", () => {
  it("accepts a normal message and trims spaces", () => {
    const result = contactSchema.safeParse({ ...valid, name: "  Ana Pérez  " });
    expect(result.success).toBe(true);
    expect(result.data?.name).toBe("Ana Pérez");
  });

  it("requires a name", () => {
    const result = contactSchema.safeParse({ ...valid, name: "   " });
    expect(result.error?.issues[0]).toMatchObject({ path: ["name"], message: "Please enter your name." });
  });

  it("rejects an invalid email", () => {
    const result = contactSchema.safeParse({ ...valid, email: "ana@" });
    expect(result.error?.issues[0]?.path).toEqual(["email"]);
  });

  it("rejects a message that is too short", () => {
    const result = contactSchema.safeParse({ ...valid, message: "Hi" });
    expect(result.error?.issues[0]?.path).toEqual(["message"]);
  });

  it("rejects a message that is too long", () => {
    const result = contactSchema.safeParse({ ...valid, message: "x".repeat(5001) });
    expect(result.error?.issues[0]?.path).toEqual(["message"]);
  });

  it("flags the spam trap when it's filled in", () => {
    const result = contactSchema.safeParse({ ...valid, website: "http://spam.example" });
    expect(result.error?.issues[0]?.path).toEqual(["website"]);
  });
});
