import type { Metadata } from "next";
import { CtaBand, PageHeader, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "About us",
  description: "Why TeamVory exists, and what we believe a good schedule should do.",
};

const values = [
  {
    title: "Fair by design",
    text: "Hours follow availability, not who asks the loudest. Everyone can see the rules are the same for all.",
  },
  {
    title: "Simple enough for a busy day",
    text: "Owners don't have time to learn complicated software. Every screen does one job, and works on a phone.",
  },
  {
    title: "Respect people's time",
    text: "Staff enter their availability once. Owners stop spending evenings on the schedule.",
  },
  {
    title: "Your data stays yours",
    text: "We only collect what scheduling needs, never sell it, and keep each business's data separate.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About us"
        intro="TeamVory is built for the owners and managers of small, medium and seasonal businesses, and the teams who work for them."
      />

      <Section>
        <div className="max-w-3xl space-y-5 text-lg text-navy/80">
          <h2 className="text-2xl text-navy sm:text-3xl">Why we built TeamVory</h2>
          <p>
            TeamVory started with a seasonal business owner and a weekly routine many owners know
            well: collecting availability by text message, typing it into a spreadsheet, counting
            hours to keep things fair, then building the schedule cell by cell.
          </p>
          <p>
            It took hours every week, and the mistakes were easy to make and hard to spot. So we
            set out to build the tool we wished existed: one place where staff set their own
            availability, and a fair schedule takes minutes instead of an evening.
          </p>
        </div>
      </Section>

      <Section title="What we believe" tone="gray">
        <ul className="grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <li key={v.title} className="rounded-xl border bg-white p-6">
              <h3 className="text-lg">{v.title}</h3>
              <p className="mt-2 text-muted-foreground">{v.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand title="Give your team a schedule they can trust." />
    </>
  );
}
