import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/forms/auth-heading";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;

  if (typeof token !== "string" || !token) {
    return (
      <>
        <AuthHeading title="This link doesn't work" intro="The reset link is missing or incomplete." />
        <Link href="/forgot-password" className="font-semibold text-teal-dark hover:underline">
          Ask for a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Choose a new password" intro="You'll be logged out everywhere else, for safety." />
      <ResetPasswordForm token={token} />
    </>
  );
}
