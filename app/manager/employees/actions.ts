"use server";

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { isUuid } from "@/lib/ids";
import { sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-content";
import { teamSender } from "@/lib/team-sender";
import { errorState, type FormState } from "@/lib/form-state";
import type { Role } from "@/lib/generated/prisma/enums";
import { canChangeRole, canInvite, canManageMember } from "@/lib/permissions";
import { isRateLimited } from "@/lib/rate-limit";
import { requireManager } from "@/lib/session";
import { createToken, sha256 } from "@/lib/tokens";
import { appUrl } from "@/lib/urls";
import { fieldErrors, inviteSchema } from "@/lib/validation/auth";

const INVITE_DAYS = 3; // docs/architecture.md: invitation links expire after 72 hours
const roleWord: Record<Role, string> = { OWNER: "owner", MANAGER: "manager", EMPLOYEE: "team member" };

/** Creates a fresh invitation (replacing any open one for the same email) and emails it. */
async function issueInvitation(
  actor: { membershipId: string; userName: string; businessId: string; businessName: string },
  email: string,
  role: Role,
  name: string | null,
) {
  const token = createToken();
  await db.$transaction([
    db.invitation.updateMany({
      where: { businessId: actor.businessId, email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    db.invitation.create({
      data: {
        businessId: actor.businessId,
        email,
        name,
        role,
        tokenHash: sha256(token),
        invitedById: actor.membershipId,
        expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  await sendEmail({
    ...(await teamSender(actor.businessId)),
    to: email,
    ...renderEmail({
      subject: `${actor.userName} invited you to ${actor.businessName} on TeamVory`,
      icon: "invite",
      heading: `Join ${actor.businessName} on TeamVory`,
      greeting: name ? `Hi ${name.split(" ")[0]},` : "Hi,",
      businessName: actor.businessName,
      blocks: [
        { type: "p", text: `${actor.userName} invited you to join ${actor.businessName} on TeamVory as a ${roleWord[role]}.` },
        { type: "button", label: "Accept invitation", url: `${appUrl()}/invite/${token}` },
        { type: "small", text: `The invitation works for ${INVITE_DAYS} days. If you weren't expecting it, you can ignore this email.` },
      ],
    }),
  });
}

async function actorContext() {
  const { user, membership } = await requireManager();
  return {
    user,
    membership,
    actor: {
      membershipId: membership.id,
      userName: user.name,
      businessId: membership.businessId,
      businessName: membership.businessName,
    },
  };
}

export async function inviteMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership, actor } = await actorContext();
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? "EMPLOYEE"),
  };
  const parsed = inviteSchema.safeParse(values);
  if (!parsed.success) return errorState(undefined, fieldErrors(parsed.error), values);

  const { name, email, role } = parsed.data;
  if (!canInvite(membership.role, role)) return errorState("Only the owner can invite managers.", undefined, values);

  const existing = await db.membership.findFirst({
    where: { businessId: membership.businessId, user: { email } },
    select: { status: true },
  });
  if (existing) {
    return errorState(
      undefined,
      {
        email:
          existing.status === "ACTIVE"
            ? "This person is already on your team."
            : "This person is on your team but inactive. Turn them back on in the list below.",
      },
      values,
    );
  }

  if (await isRateLimited(`invite-send:${membership.businessId}`, 100, 24 * 60 * 60 * 1000)) {
    return errorState("You've sent a lot of invitations today. Please try again tomorrow.", undefined, values);
  }

  await issueInvitation(actor, email, role, name);
  refresh();
  return { status: "success", message: `Invitation sent to ${name} (${email}).` };
}

export async function resendInvitation(formData: FormData) {
  const { membership, actor } = await actorContext();
  const invitationId = formData.get("invitationId");
  if (!isUuid(invitationId)) return;
  const invitation = await db.invitation.findFirst({
    where: { id: invitationId, businessId: membership.businessId, acceptedAt: null },
  });
  if (!invitation || !canInvite(membership.role, invitation.role)) return;
  await issueInvitation(actor, invitation.email, invitation.role, invitation.name);
  refresh();
}

export async function revokeInvitation(formData: FormData) {
  const { membership } = await requireManager();
  const invitationId = formData.get("invitationId");
  if (!isUuid(invitationId)) return;
  await db.invitation.updateMany({
    where: { id: invitationId, businessId: membership.businessId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  refresh();
}

/** Finds a member of the current business, or null (never another business's member). */
async function findTarget(businessId: string, membershipId: string) {
  if (!isUuid(membershipId)) return null;
  return db.membership.findFirst({ where: { id: membershipId, businessId }, select: { id: true, role: true } });
}

export async function setMemberStatus(formData: FormData) {
  const { membership } = await requireManager();
  const status = formData.get("status") === "ACTIVE" ? "ACTIVE" : "INACTIVE";
  const target = await findTarget(membership.businessId, String(formData.get("membershipId")));
  if (!target || !canManageMember(membership, target)) return;
  await db.membership.update({ where: { id: target.id }, data: { status } });
  refresh();
}

export async function changeMemberRole(formData: FormData) {
  const { membership } = await requireManager();
  const role = formData.get("role") === "MANAGER" ? "MANAGER" : "EMPLOYEE";
  const target = await findTarget(membership.businessId, String(formData.get("membershipId")));
  if (!target || !canChangeRole(membership, target, role)) return;
  await db.membership.update({ where: { id: target.id }, data: { role } });
  refresh();
}
