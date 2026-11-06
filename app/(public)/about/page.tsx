import type { Metadata } from "next";
import { CtaBand, PageHeader, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "About us",
  description: "Why TeamVory exists, and what we believe a good schedule should do.",
};

const values = [
  {
    title: "Fair by design",
    text: "Scheduling should be based on availability, business needs, and consistent rules. Every team member deserves a fair opportunity to work.",
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
    text: "We believe businesses should have control over their information. Your team's scheduling data should stay private and separate from other businesses' data.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="About us"
        intro="TeamVory is built for business owners, managers, and the teams who keep businesses running. Whether you manage a small team, a growing business, or a seasonal workforce, we believe organizing work should be simpler."
      />

      <Section>
        <div className="max-w-3xl space-y-5 text-lg text-navy/80">
          <h2 className="text-2xl text-navy sm:text-3xl">Why we built TeamVory</h2>
          <p>
            TeamVory started with a seasonal business owner and a weekly routine many business
            owners know well: collecting employee availability through text messages, entering
            everything into a spreadsheet, balancing hours to keep things fair, and building the
            schedule cell by cell.
          </p>
          <p>It took hours every week, and mistakes were easy to make and hard to spot.</p>
          <p>
            We saw an opportunity to make things better. We set out to build the tool we wished
            existed: one place where employees can manage their availability and business owners
            can create organized, fair schedules in minutes instead of spending an entire evening
            on them.
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

      <CtaBand title="Spend less time organizing and more time focusing on your business." />
    </>
  );
}
