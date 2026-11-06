import type { Metadata } from "next";
import { AccountsComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Get started" };

export default function SignupPage() {
  return <AccountsComingSoon title="Get started" />;
}
