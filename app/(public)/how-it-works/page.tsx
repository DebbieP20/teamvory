import type { Metadata } from "next";
import { CtaBand, PageHeader, Section } from "@/components/site/sections";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "The weekly cycle in TeamVory: your team sets availability, you set up shifts, generate a fair schedule and publish it.",
};

const cycle = [
  {
    who: "Your team",
    title: "Set availability",
    points: [
      "Each person sets a default week once: the days and times they can usually work.",
      "When a week is different, they change just that week. Time off is added the same way, with no approval needed.",
      "No deadlines. If you like, TeamVory emails a reminder on the days you choose, only to people who haven't set next week yet.",
    ],
  },
  {
    who: "You",
    title: "Set up the week's shifts",
    points: [
      "Copy last week in one click, or apply a saved pattern such as your standard 12–5 and 5–9 shifts.",
      "Expecting a slow, rainy day? Switch that one day to fewer people. The rest of the week stays as it is.",
      "Add extra shifts for events by hand.",
    ],
  },
  {
    who: "TeamVory",
    title: "Generate a fair schedule",
    points: [
      "Hours are shared in proportion to availability: someone who can work twice as much gets about twice the hours.",
      "Hard-to-fill shifts are filled first. Nobody is scheduled outside their availability, on time off, or on two shifts at once.",
      "The owner can be the backup: pin the shifts you want to work, and you're added to any shift nobody else can cover.",
      "Don't like it? Regenerate for a different, equally fair schedule, or change any shift by hand.",
    ],
  },
  {
    who: "You",
    title: "Publish",
    points: [
      "Everyone gets an email with their shifts. They can see the whole team's schedule on their phone.",
      "Need to change something later? Publish again, and only the people affected are told.",
    ],
  },
];

const faqs = [
  {
    q: "Does my team need to install an app?",
    a: "No. TeamVory works in any web browser, on a phone or a computer.",
  },
  {
    q: "What if someone can't work their shift?",
    a: "They can ask a coworker to swap, or post the shift as open so anyone who's available can pick it up. They stay on the schedule until someone does. You choose whether swaps need your approval.",
  },
  {
    q: "What if nobody is available for a shift?",
    a: "TeamVory tells you exactly which shifts still need people. If the owner works shifts, they can cover them automatically.",
  },
  {
    q: "Can I still make the schedule myself?",
    a: "Yes. You can assign every shift by hand, generate it, or mix both: pin the shifts you've decided and generate the rest.",
  },
  {
    q: "What about staff who only work part of the year?",
    a: "Between seasons they're set to inactive and their history is kept. At the start of a season, tick who's back.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How it works"
        intro="One simple cycle every week. Most of it happens on its own."
      />

      <Section>
        <ol className="space-y-10">
          {cycle.map((step, i) => (
            <li key={step.title} className="grid gap-4 md:grid-cols-[14rem_1fr]">
              <div className="flex items-start gap-4 md:block">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal font-heading font-semibold text-navy">
                  {i + 1}
                </span>
                <div className="md:mt-3">
                  <p className="text-sm font-semibold tracking-wide text-teal-dark uppercase">{step.who}</p>
                  <h2 className="text-xl">{step.title}</h2>
                </div>
              </div>
              <ul className="list-disc space-y-2 pl-5 text-muted-foreground marker:text-teal">
                {step.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Questions" tone="gray">
        <dl className="grid gap-6 md:grid-cols-2">
          {faqs.map(({ q, a }) => (
            <div key={q} className="rounded-xl border bg-white p-6">
              <dt className="font-heading font-semibold">{q}</dt>
              <dd className="mt-2 text-muted-foreground">{a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <CtaBand />
    </>
  );
}
