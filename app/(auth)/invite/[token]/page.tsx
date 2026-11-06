import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/forms/auth-heading";
import { SubmitButton } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { sha256 } from "@/lib/tokens";
import { acceptInvitation, logOut } from "../../actions";
import { NewAccountForm } from "./new-account-form";

export const metadata: Metadata = { title: "Join your team" };

const roleLabel = { OWNER: "an owner", MANAGER: "a manager", EMPLOYEE: "a team member" } as const;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    include: { business: { select: { name: true } } },
  });

  if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt < new Date()) {
    const used = invitation?.acceptedAt;
    return (
      <>
        <AuthHeading
          title={used ? "This invitation was already used" : "This invitation isn't valid"}
          intro={
            used
              ? "If it was you, just log in."
              : "It may have expired or been replaced by a newer one. Ask your manager to send you a new invitation."
          }
        />
        <Button asChild size="lg" className="h-11 w-full font-semibold">
          <Link href="/login">Log in</Link>
        </Button>
      </>
    );
  }

  const heading = (
    <AuthHeading
      title={`Join ${invitation.business.name}`}
      intro={`You've been invited to TeamVory as ${roleLabel[invitation.role]} of ${invitation.business.name}.`}
    />
  );

  const user = await getSessionUser();
  if (user) {
    if (user.email.toLowerCase() !== invitation.email) {
      return (
        <>
          {heading}
          <p className="mb-5 text-navy/80">
            You&apos;re logged in as <strong>{user.email}</strong>, but this invitation is for{" "}
            <strong>{invitation.email}</strong>. Log out, then open the invitation link again.
          </p>
          <form action={logOut}>
            <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
              Log out
            </Button>
          </form>
        </>
      );
    }
    return (
      <>
        {heading}
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton pendingText="Joining…" className="w-full">
            Join {invitation.business.name}
          </SubmitButton>
        </form>
      </>
    );
  }

  const hasAccount = await db.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
  if (hasAccount) {
    return (
      <>
        {heading}
        <p className="mb-5 text-navy/80">
          You already have a TeamVory account for <strong>{invitation.email}</strong>. Log in to accept.
        </p>
        <Button asChild size="lg" className="h-11 w-full font-semibold">
          <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}>Log in to accept</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      {heading}
      <NewAccountForm token={token} email={invitation.email} />
    </>
  );
}
