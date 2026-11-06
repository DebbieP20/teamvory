import Link from "next/link";
import { PageHeader, Section } from "@/components/site/sections";
import { Button } from "@/components/ui/button";

// Placeholder for account pages until they're built in milestone M2.
export function AccountsComingSoon({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} intro="Accounts are coming soon." />
      <Section>
        <p className="max-w-xl text-lg text-navy/80">
          We&apos;re getting TeamVory ready for its first businesses. Want to be one of them, or have a
          question? Send us a message.
        </p>
        <Button asChild size="lg" className="mt-6 h-11 px-6 font-semibold">
          <Link href="/contact">Contact us</Link>
        </Button>
      </Section>
    </>
  );
}
