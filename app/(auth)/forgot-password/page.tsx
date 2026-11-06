import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/forms/auth-heading";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password" intro="Enter your email and we'll send you a link to choose a new password." />
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-semibold text-teal-dark hover:underline">
          Back to log in
        </Link>
      </p>
    </>
  );
}
