import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/forms/auth-heading";
import { getMembership, getSessionUser, homePath } from "@/lib/session";
import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "Get started" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(homePath(await getMembership(user.id)));

  return (
    <>
      <AuthHeading title="Create your business" intro="Set up TeamVory in a few minutes. You'll invite your team next." />
      <SignUpForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-teal-dark hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
