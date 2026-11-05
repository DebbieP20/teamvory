import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using TeamVory.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 2026">
      <p>
        These terms are an agreement between TeamVory and the business that creates an account
        (&ldquo;you&rdquo;), and also apply to the people that business invites. By using TeamVory you
        agree to them.
      </p>

      <h2>The service</h2>
      <p>
        TeamVory helps businesses collect staff availability, build and publish work schedules, and
        manage shift changes. We may improve or change features over time.
      </p>

      <h2>Accounts</h2>
      <ul>
        <li>The person who signs up a business is its owner and is responsible for its account.</li>
        <li>
          Owners and managers decide who to invite, and make sure they&apos;re allowed to add those
          people&apos;s information.
        </li>
        <li>Keep your password private, and tell us if you think someone else is using your account.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        The information you and your team enter belongs to your business. We only use it to provide
        the service, as described in our{" "}
        <Link href="/privacy" className="font-semibold text-teal-dark hover:underline">
          Privacy Policy
        </Link>
        . You can ask for a copy of it at any time.
      </p>

      <h2>Acceptable use</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>use TeamVory for anything unlawful, or to harass or harm anyone;</li>
        <li>try to access another business&apos;s data, or get around security or usage limits;</li>
        <li>send spam through the service, or overload it on purpose.</li>
      </ul>

      <h2>Fees</h2>
      <p>
        TeamVory will be offered as a monthly subscription per business. Prices will be published
        before any charges begin, and we&apos;ll give account owners notice before prices change.
      </p>

      <h2>Your responsibilities as an employer</h2>
      <p>
        TeamVory helps you plan schedules, but you remain responsible for your staffing decisions
        and for following the employment laws that apply to your business, such as rules on hours,
        breaks and pay.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep TeamVory available and reliable, but can&apos;t promise it will never be
        interrupted. We may need to pause it briefly for maintenance.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can close your account at any time. We may suspend accounts that break these terms.
        After closing, your data is handled as described in the Privacy Policy.
      </p>

      <h2>Limits of liability</h2>
      <p>
        TeamVory is provided &ldquo;as is&rdquo;. To the extent the law allows, we aren&apos;t liable for
        indirect losses, such as lost profits, caused by using or being unable to use the service.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        If we change these terms, we&apos;ll update the date at the top and tell account owners about
        important changes before they take effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Use our{" "}
        <Link href="/contact" className="font-semibold text-teal-dark hover:underline">
          contact page
        </Link>
        .
      </p>
    </LegalPage>
  );
}
