import type { Role } from "@/lib/generated/prisma/enums";

// Who can manage whom (docs/permissions.md). Pure functions, so they're easy
// to unit test; the server actions call them before every change.

export const isManagerRole = (role: Role) => role === "OWNER" || role === "MANAGER";

/** Owners can invite managers and employees; managers can invite employees. */
export function canInvite(actor: Role, invitedRole: Role): boolean {
  if (invitedRole === "OWNER") return false;
  if (actor === "OWNER") return true;
  return actor === "MANAGER" && invitedRole === "EMPLOYEE";
}

/**
 * Can `actor` change another person's details or active/inactive status?
 * Nobody changes themselves or the owner; managers only manage employees.
 */
export function canManageMember(actor: { role: Role; id: string }, target: { role: Role; id: string }): boolean {
  if (actor.id === target.id || target.role === "OWNER") return false;
  if (actor.role === "OWNER") return true;
  return actor.role === "MANAGER" && target.role === "EMPLOYEE";
}

/** Only the owner promotes employees to manager or demotes managers. */
export function canChangeRole(actor: { role: Role; id: string }, target: { role: Role; id: string }, newRole: Role): boolean {
  if (newRole === "OWNER") return false;
  return actor.role === "OWNER" && canManageMember(actor, target);
}
