import type { Metadata } from "next";
import { PageHeader, Section } from "@/components/site/sections";
import { siteConfig } from "@/lib/site-config";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about TeamVory, or need help? Send us a message.",
};

export default function ContactPage() {
  const { contact } = siteConfig;

  return (
    <>
      <PageHeader
        title="Contact us"
        intro="Questions before you sign up, or need help with your account? Send us a message."
      />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <ContactForm />
          <aside className="space-y-6 text-muted-foreground">
            <div>
              <h2 className="text-lg text-navy">What to include</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-teal">
                <li>Your business name and how many people you schedule.</li>
                <li>If something isn&apos;t working, which page you were on and what happened.</li>
              </ul>
            </div>
            {(contact.email || contact.phone) && (
              <div>
                <h2 className="text-lg text-navy">Other ways to reach us</h2>
                {contact.email && (
                  <p className="mt-3">
                    <a href={`mailto:${contact.email}`} className="font-semibold text-teal-dark hover:underline">
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p className="mt-1">
                    <a href={`tel:${contact.phone}`} className="font-semibold text-teal-dark hover:underline">
                      {contact.phone}
                    </a>
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </Section>
    </>
  );
}
