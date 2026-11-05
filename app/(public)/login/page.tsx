import type { Metadata } from "next";
import { AccountsComingSoon } from "@/components/site/coming-soon";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return <AccountsComingSoon title="Log in" />;
}
