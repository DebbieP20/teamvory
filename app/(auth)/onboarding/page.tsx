import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/forms/auth-heading";
import { getMembership, requireUser } from "@/lib/session";
import { CreateBusinessForm } from "./create-business-form";

export const metadata: Metadata = { title: "Create your business" };

// For an account that isn't part of any business yet.
export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getMembership(user.id)) redirect("/manager");

  return (
    <>
      <AuthHeading
        title={`Welcome, ${user.name}`}
        intro="Your account isn't part of a business yet. Create one, or ask your manager to invite you."
      />
      <CreateBusinessForm />
    </>
  );
}
