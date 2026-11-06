import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/forms/auth-heading";
import { Button } from "@/components/ui/button";
import { getMembership, homePath, requireUser } from "@/lib/session";
import { logOut } from "../actions";

export const metadata: Metadata = { title: "Account inactive" };

export default async function InactivePage() {
  const user = await requireUser();
  const membership = await getMembership(user.id);
  if (membership?.status !== "INACTIVE") redirect(homePath(membership));

  return (
    <>
      <AuthHeading
        title="Your account is inactive"
        intro={`Your access to ${membership.businessName} is turned off for now, for example between seasons. Ask your manager to turn it back on.`}
      />
      <form action={logOut}>
        <Button type="submit" variant="outline" size="lg" className="h-11 w-full">
          Log out
        </Button>
      </form>
    </>
  );
}
