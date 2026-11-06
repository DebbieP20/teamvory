import { describe, expect, it } from "vitest";
import { inviteSchema, resetPasswordSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  const valid = { name: "Dana", businessName: "Dana's Café", email: " Dana@Example.com ", password: "summer sunshine" };

  it("normalizes the email to lower case", () => {
    expect(signUpSchema.parse(valid).email).toBe("dana@example.com");
  });
  it("requires at least 8 characters for the password", () => {
    const r = signUpSchema.safeParse({ ...valid, password: "short" });
    expect(r.error?.issues[0]).toMatchObject({ path: ["password"], message: "Use at least 8 characters." });
  });
  it("requires a business name", () => {
    expect(signUpSchema.safeParse({ ...valid, businessName: " " }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires both passwords to match", () => {
    const r = resetPasswordSchema.safeParse({ token: "t", password: "long enough", confirm: "different!" });
    expect(r.error?.issues[0]?.path).toEqual(["confirm"]);
  });
});

describe("inviteSchema", () => {
  it("only allows employee or manager invitations", () => {
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "OWNER" }).success).toBe(false);
    expect(inviteSchema.safeParse({ email: "a@b.co", role: "MANAGER" }).success).toBe(true);
  });
});
