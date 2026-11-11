"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorState, type FormState } from "@/lib/form-state";
import { clientIpHash, isRateLimited } from "@/lib/rate-limit";
import { getMembership, getSessionUser, homePath, requireUser } from "@/lib/session";
import { DEFAULT_PATTERNS } from "@/lib/schedule";
import { sha256 } from "@/lib/tokens";
import { safeNextPath } from "@/lib/urls";
import {
  acceptInviteNewAccountSchema,
  createBusinessSchema,
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/auth";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function errorCode(error: unknown): string | undefined {
  return isAPIError(error) ? (error.body as { code?: string } | undefined)?.code : undefined;
}

/** Creates the owner's business. Used by sign-up and by onboarding. */
async function createBusinessFor(userId: string, businessName: string) {
  await db.business.create({
    data: {
      name: businessName,
      // The owner picks their own shifts and covers gaps (decision 19), so their
      // default week starts as "all day" and they only mark days off.
      memberships: {
        create: {
          userId,
          role: "OWNER",
          schedulingMode: "BACKUP",
          availabilityTemplate: {
            create: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i + 1, kind: "ALL_DAY" as const })),
          },
        },
      },
      // Starting patterns (decision 23); the owner can edit or delete them.
      shiftPatterns: { create: DEFAULT_PATTERNS.map((p) => ({ name: p.name, shifts: p.shifts })) },
    },
  });
}

// ---------------------------------------------------------------------------

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: text(formData, "name"), businessName: text(formData, "businessName"), email: text(formData, "email") };
  const parsed = signUpSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return errorState("Please check the highlighted fields.", fieldErrors(parsed.error), values);

  if (await isRateLimited(`signup:${await clientIpHash()}`, 10, HOUR)) return errorState(TOO_MANY, undefined, values);

  const { name, businessName, email, password } = parsed.data;
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({ body: { name, email, password }, headers: await headers() });
    userId = result.user.id;
  } catch (error) {
    if (errorCode(error)?.startsWith("USER_ALREADY_EXISTS")) {
      return errorState(undefined, { email: "An account with this email already exists. Log in instead." }, values);
    }
    throw error;
  }

  await createBusinessFor(userId, businessName);
  redirect("/manager");
}

export async function logIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = loginSchema.safeParse({ ...values, password: text(formData, "password") });
  if (!parsed.success) return errorState("Please check the highlighted fields.", fieldErrors(parsed.error), values);

  const { email, password } = parsed.data;
  // Per IP + email, so one person can't lock someone else out from elsewhere.
  if (await isRateLimited(`login:${await clientIpHash()}:${sha256(email)}`, 10, 15 * MINUTE)) {
    return errorState(TOO_MANY, undefined, values);
  }

  let userId: string;
  try {
    const result = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    userId = result.user.id;
  } catch (error) {
    if (isAPIError(error)) return errorState("Email or password is incorrect.", undefined, values);
    throw error;
  }

  const next = safeNextPath(formData.get("next"));
  redirect(next ?? homePath(await getMembership(userId)));
}

export async function logOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { email: text(formData, "email") };
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return errorState(undefined, fieldErrors(parsed.error), values);

  if (await isRateLimited(`reset:${await clientIpHash()}`, 5, HOUR)) return errorState(TOO_MANY, undefined, values);

  // Same answer whether or not the account exists, so this can't be used to find accounts.
  await auth.api.requestPasswordReset({ body: { email: parsed.data.email }, headers: await headers() });
  return {
    status: "success",
    message: "If there's an account for that email, we've sent a link to reset the password. It works for 1 hour.",
  };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: text(formData, "token"),
    password: text(formData, "password"),
    confirm: text(formData, "confirm"),
  });
  if (!parsed.success) return errorState(undefined, fieldErrors(parsed.error));

  try {
    await auth.api.resetPassword({ body: { token: parsed.data.token, newPassword: parsed.data.password } });
  } catch (error) {
    if (isAPIError(error)) {
      return errorState("This reset link is invalid or has expired. Please ask for a new one.");
    }
    throw error;
  }
  redirect("/login?reset=1");
}

export async function createBusiness(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/manager");

  const values = { businessName: text(formData, "businessName") };
  const parsed = createBusinessSchema.safeParse(values);
  if (!parsed.success) return errorState(undefined, fieldErrors(parsed.error), values);

  await createBusinessFor(user.id, parsed.data.businessName);
  redirect("/manager");
}

// ---------------------------------------------------------------------------
// Invitations (sent from Manager → Employees)

async function findOpenInvitation(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { business: { select: { name: true } } },
  });
  if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt < new Date()) return null;
  return invitation;
}

/** Adds the user to the business (or reactivates them) and marks the invitation used. */
async function joinBusiness(userId: string, invitation: { id: string; businessId: string; role: "OWNER" | "MANAGER" | "EMPLOYEE" }) {
  await db.$transaction([
    db.membership.upsert({
      where: { userId_businessId: { userId, businessId: invitation.businessId } },
      create: { userId, businessId: invitation.businessId, role: invitation.role },
      update: { status: "ACTIVE" },
    }),
    db.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }),
  ]);
}

/** For someone who is already logged in with the invited email address. */
export async function acceptInvitation(formData: FormData) {
  const user = await requireUser();
  const invitation = await findOpenInvitation(text(formData, "token"));
  if (!invitation || invitation.email !== user.email.toLowerCase()) redirect(`/invite/${text(formData, "token")}`);

  await joinBusiness(user.id, invitation);
  redirect(homePath(await getMembership(user.id)));
}

/** For someone new: creates their account with the invited email, then joins. */
export async function acceptInvitationNewAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { name: text(formData, "name") };
  const parsed = acceptInviteNewAccountSchema.safeParse({
    ...values,
    token: text(formData, "token"),
    password: text(formData, "password"),
  });
  if (!parsed.success) return errorState(undefined, fieldErrors(parsed.error), values);

  if (await isRateLimited(`invite:${await clientIpHash()}`, 20, HOUR)) return errorState(TOO_MANY, undefined, values);

  const invitation = await findOpenInvitation(parsed.data.token);
  if (!invitation) return errorState("This invitation is no longer valid. Ask your manager to send a new one.");
  if (await getSessionUser()) return errorState("Please log out first, then open the invitation link again.");

  try {
    const result = await auth.api.signUpEmail({
      body: { name: parsed.data.name, email: invitation.email, password: parsed.data.password },
      headers: await headers(),
    });
    await joinBusiness(result.user.id, invitation);
  } catch (error) {
    if (errorCode(error)?.startsWith("USER_ALREADY_EXISTS")) {
      return errorState("There's already an account for this email. Log in to accept the invitation.");
    }
    throw error;
  }
  redirect(invitation.role === "EMPLOYEE" ? "/employee" : "/manager");
}
