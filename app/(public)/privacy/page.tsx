import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/site/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information TeamVory collects, why, and how it is protected.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 2026">
      <p>
        TeamVory is an employee scheduling service. This policy explains what information we
        collect, why we collect it, and the choices you have. We only collect what scheduling needs.
      </p>

      <h2>Who this applies to</h2>
      <ul>
        <li>
          <strong>Businesses</strong> (owners and managers) who create a TeamVory account.
        </li>
        <li>
          <strong>Employees</strong> who are invited by their employer.
        </li>
        <li>
          <strong>Visitors</strong> to this website, including anyone who sends us a message.
        </li>
      </ul>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> name, email address, an optional phone number, and a
          securely scrambled (hashed) version of your password. We never see your actual password.
        </li>
        <li>
          <strong>Scheduling information:</strong> availability, time off and notes you add,
          shifts, schedules, shift swap requests and the hours worked that follow from them.
        </li>
        <li>
          <strong>Contact form messages:</strong> your name, email address and message. To stop
          spam, we also keep a one-way scrambled code made from your IP address, never the address
          itself.
        </li>
        <li>
          <strong>Basic technical records:</strong> standard server logs (for example, errors) kept
          for a short time to keep the service running and secure.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: building, publishing and sharing schedules.</li>
        <li>To send emails you expect: invitations, published schedules, changes and reminders.</li>
        <li>To reply to your messages and support requests.</li>
        <li>To keep the service secure and prevent abuse.</li>
      </ul>
      <p>We do not sell personal information, and we do not use it for advertising.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>
          Each business&apos;s data is kept separate. Other businesses using TeamVory can&apos;t see
          it.
        </li>
        <li>
          Owners and managers can see their team&apos;s availability, time off, hours and contact
          details.
        </li>
        <li>
          Employees can see coworkers&apos; names and published shifts only, never their
          availability, hours, email or phone number.
        </li>
        <li>
          We use trusted service providers to run TeamVory, such as hosting, database and email
          providers. They only process data on our behalf.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We only use cookies that are needed to keep you signed in and secure. We don&apos;t use
        advertising or tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Business and scheduling data is kept while the business has an account, so that past
        schedules and hour reports stay correct. When a business closes its account, its data is
        deleted within a reasonable time, except where we must keep it by law. Contact form messages
        are kept as long as needed to respond and follow up.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>You can see and update your own details in your profile.</li>
        <li>
          Employees: your employer manages your account, so ask them first. You can also contact us.
        </li>
        <li>
          You can ask us for a copy of your information, or ask us to correct or delete it, by{" "}
          <Link href="/contact" className="font-semibold text-teal-dark hover:underline">
            contacting us
          </Link>
          .
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Connections are encrypted, passwords are stored hashed, and every request is checked so
        people only see what their role allows. No system is perfectly secure, but we work to keep
        your information safe and will tell affected businesses about any serious problem.
      </p>

      <h2>Children</h2>
      <p>TeamVory is meant for working adults and isn&apos;t directed at children.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date at the top. For important changes, we&apos;ll
        tell account owners by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Use our{" "}
        <Link href="/contact" className="font-semibold text-teal-dark hover:underline">
          contact page
        </Link>
        .
      </p>
    </LegalPage>
  );
}
