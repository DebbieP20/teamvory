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
      "Each employee sets their regular availability once, including the days and times they can usually work.",
      "When a week looks different, they update only that week. They can also submit time-off requests.",
      "Set a weekly availability deadline and send automatic email reminders to employees who haven't submitted their availability yet.",
    ],
  },
  {
    who: "You",
    title: "Set up the week's shifts",
    points: [
      "Copy last week's schedule in one click, or apply a saved shift pattern for your business.",
      "Need fewer employees on a slow or rainy day? Adjust staffing for that day without changing the rest of the week.",
      "Add extra shifts for events, busy periods, or special occasions.",
    ],
  },
  {
    who: "TeamVory",
    title: "Generate a fair schedule",
    points: [
      "TeamVory distributes hours fairly based on employee availability and your staffing needs.",
      "Hard-to-fill shifts are prioritized. Employees are never assigned outside their availability, during approved time off, or to overlapping shifts.",
      "Need to cover a shift yourself? Add your preferred shifts and let TeamVory help identify where you can step in.",
      "Not satisfied with the result? Regenerate the schedule, make manual adjustments, or combine both approaches.",
    ],
  },
  {
    who: "You",
    title: "Publish",
    points: [
      "Publish the schedule and everyone receives an email with their assigned shifts.",
      "Employees can view the full team schedule from their phone or computer.",
      "Need to change something later? Publish again, and only the people affected are told.",
    ],
  },
];

const faqs = [
  {
    q: "Does my team need to install an app?",
    a: "No. TeamVory works directly in a web browser on a phone, tablet, or computer. No app installation is required.",
  },
  {
    q: "What if someone can't work their shift?",
    a: "They can ask a coworker to swap, or post the shift as open so anyone who's available can pick it up. They stay on the schedule until someone does. You choose whether swaps need your approval.",
  },
  {
    q: "What if nobody is available for a shift?",
    a: "TeamVory identifies shifts that still need coverage so you can take action. If you also work shifts, you can set yourself up as a backup.",
  },
  {
    q: "Can I still make the schedule myself?",
    a: "Absolutely. You can build the entire schedule manually, generate it automatically, or combine both methods. Pin the shifts you've already assigned and let TeamVory fill in the rest.",
  },
  {
    q: "What about staff who only work part of the year?",
    a: "TeamVory supports seasonal teams. You can mark employees as inactive between seasons while keeping their scheduling history. When the next season begins, simply reactivate the employees who are returning.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How it works"
        intro="One simple cycle every week. Less manual work, more time for your business."
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
