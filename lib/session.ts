import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Role } from "@/lib/generated/prisma/enums";
import { isManagerRole } from "@/lib/permissions";

// Data Access Layer: the one place that reads the session. Every protected
// page and server action goes through these helpers, and every query that
// follows is scoped to `membership.businessId`.

export type SessionUser = { id: string; name: string; email: string };
export type CurrentMembership = {
  id: string;
  role: Role;
  status: "ACTIVE" | "INACTIVE";
  businessId: string;
  businessName: string;
};

/** The signed-in user, or null. Cached for the rest of this request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
});

/**
 * The user's membership. People normally belong to one business; if they
 * belong to several, an active one is preferred (a business switcher can come later).
 */
export const getMembership = cache(async (userId: string): Promise<CurrentMembership | null> => {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { business: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  const m = memberships.find((x) => x.status === "ACTIVE") ?? memberships[0];
  if (!m) return null;
  return { id: m.id, role: m.role, status: m.status, businessId: m.businessId, businessName: m.business.name };
});

/** Where a signed-in person belongs right after logging in. */
export function homePath(membership: CurrentMembership | null): string {
  if (!membership) return "/onboarding";
  if (membership.status === "INACTIVE") return "/inactive";
  return isManagerRole(membership.role) ? "/manager" : "/employee";
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Signed in, with an active membership in one of `roles`; otherwise redirected. */
export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (!membership || membership.status !== "ACTIVE" || !roles.includes(membership.role)) {
    redirect(homePath(membership));
  }
  return { user, membership };
}

export const requireManager = () => requireRole(["OWNER", "MANAGER"]);
export const requireEmployee = () => requireRole(["EMPLOYEE"]);
