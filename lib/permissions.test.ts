import { describe, expect, it } from "vitest";
import { canChangeRole, canInvite, canManageMember } from "./permissions";

const owner = { id: "o", role: "OWNER" as const };
const manager = { id: "m", role: "MANAGER" as const };
const manager2 = { id: "m2", role: "MANAGER" as const };
const employee = { id: "e", role: "EMPLOYEE" as const };

describe("canInvite", () => {
  it("lets the owner invite managers and employees", () => {
    expect(canInvite("OWNER", "MANAGER")).toBe(true);
    expect(canInvite("OWNER", "EMPLOYEE")).toBe(true);
  });
  it("lets managers invite employees only", () => {
    expect(canInvite("MANAGER", "EMPLOYEE")).toBe(true);
    expect(canInvite("MANAGER", "MANAGER")).toBe(false);
  });
  it("never allows inviting an owner, and employees can't invite", () => {
    expect(canInvite("OWNER", "OWNER")).toBe(false);
    expect(canInvite("EMPLOYEE", "EMPLOYEE")).toBe(false);
  });
});

describe("canManageMember", () => {
  it("lets the owner manage managers and employees", () => {
    expect(canManageMember(owner, manager)).toBe(true);
    expect(canManageMember(owner, employee)).toBe(true);
  });
  it("lets managers manage employees but not other managers or the owner", () => {
    expect(canManageMember(manager, employee)).toBe(true);
    expect(canManageMember(manager, manager2)).toBe(false);
    expect(canManageMember(manager, owner)).toBe(false);
  });
  it("never lets anyone change themselves", () => {
    expect(canManageMember(owner, owner)).toBe(false);
    expect(canManageMember(manager, manager)).toBe(false);
  });
  it("gives employees no management rights", () => {
    expect(canManageMember(employee, { id: "e2", role: "EMPLOYEE" })).toBe(false);
  });
});

describe("canChangeRole", () => {
  it("lets only the owner promote and demote", () => {
    expect(canChangeRole(owner, employee, "MANAGER")).toBe(true);
    expect(canChangeRole(owner, manager, "EMPLOYEE")).toBe(true);
    expect(canChangeRole(manager, employee, "MANAGER")).toBe(false);
  });
  it("never makes anyone an owner", () => {
    expect(canChangeRole(owner, manager, "OWNER")).toBe(false);
  });
});
