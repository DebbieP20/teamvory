import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthHeading } from "@/components/forms/auth-heading";
import { getMembership, getSessionUser, homePath } from "@/lib/session";
import { safeNextPath } from "@/lib/urls";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next) ?? undefined;

  const user = await getSessionUser();
  if (user) redirect(next ?? homePath(await getMembership(user.id)));

  return (
    <>
      <AuthHeading title="Log in" />
      {params.reset === "1" && (
        <p role="status" className="mb-5 rounded-lg bg-mint px-4 py-3 text-sm text-teal-dark">
          Your password was changed. Log in with your new password.
        </p>
      )}
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to TeamVory?{" "}
        <Link href="/signup" className="font-semibold text-teal-dark hover:underline">
          Create your business
        </Link>
      </p>
    </>
  );
}
