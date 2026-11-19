import {
  ArrowRightIcon,
  ArrowRightLeftIcon,
  BellRingIcon,
  CalendarOffIcon,
  LaptopIcon,
  PartyPopperIcon,
  SmartphoneIcon,
} from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { BrowserFrame, PhoneFrame } from "@/components/site/screens";
import { CtaBand, Section } from "@/components/site/sections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import availabilityShot from "@/public/screenshots/availability.webp";
import dashboardShot from "@/public/screenshots/dashboard.webp";
import exportShot from "@/public/screenshots/export.webp";
import phoneAvailabilityShot from "@/public/screenshots/phone-availability.webp";
import phoneScheduleShot from "@/public/screenshots/phone-schedule.webp";
import phoneShiftsShot from "@/public/screenshots/phone-shifts.webp";
import reportsShot from "@/public/screenshots/reports.webp";
import scheduleShot from "@/public/screenshots/schedule.webp";

type Screen = { image: StaticImageData; alt: string };

/** The weekly cycle, each step as the owner sees it on a laptop and the team on a phone. */
const steps: { title: string; text: string; you: Screen; team: Screen }[] = [
  {
    title: "Your team sends their availability",
    text: "Each person marks the days they can work, once. You see the whole team at a glance.",
    you: {
      image: availabilityShot,
      alt: "The owner's Availability page: each person's week with their days off, and a time-off request to approve.",
    },
    team: {
      image: phoneAvailabilityShot,
      alt: "An employee's phone: Off, All day or Custom for each day of their regular week.",
    },
  },
  {
    title: "Build the week in one click",
    text: "Set the shifts you need and press Build. Every spot is filled and hours are shared fairly. Publish, and everyone gets an email.",
    you: {
      image: scheduleShot,
      alt: "The Schedule page: next week with every spot filled, two people per shift, and a birthday party shift on Saturday.",
    },
    team: {
      image: phoneScheduleShot,
      alt: "An employee's phone: their own shifts for this week and next, each with a \"Can't make it?\" link.",
    },
  },
  {
    title: "Changes sort themselves out",
    text: "Can't make a shift? Employees offer it to the team or ask a coworker to swap. You only see what needs you.",
    you: {
      image: dashboardShot,
      alt: "The owner's dashboard: both weeks published, a time-off request and an open shift under Needs your attention, and an upcoming event.",
    },
    team: {
      image: phoneShiftsShot,
      alt: "An employee's phone: an open shift to pick up and a swap request to accept or decline.",
    },
  },
];

const extras = [
  { icon: BellRingIcon, title: "Availability reminders", text: "Automatic emails to anyone who hasn't sent theirs." },
  { icon: CalendarOffIcon, title: "Time off", text: "Employees ask for days off. Approve them, or let them through." },
  { icon: PartyPopperIcon, title: "Events", text: "Add a party or catering job and staff it like any shift." },
  { icon: ArrowRightLeftIcon, title: "Your rules for swaps", text: "Approve each swap yourself, or let your team trade on their own." },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h1 className="text-4xl leading-tight sm:text-5xl">Your team, perfectly organized.</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Collect availability, build a fair schedule and share it with your team, all in one place. Your team only needs their phone.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-11 px-6 font-semibold">
                <Link href="/signup">Get started</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 border-white/30 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="#steps">
                  See it step by step <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
          <SchedulePreview />
        </div>
      </section>

      {/* The weekly cycle, in real screens */}
      <Section
        id="steps"
        tone="gray"
        className="scroll-mt-16"
        title="Your week, step by step"
        intro="Real screens from a sample café: what you see, and what your team sees."
      >
        <ol className="space-y-16 sm:space-y-20">
          {steps.map((step, i) => (
            <li key={step.title}>
              <StepHeading number={i + 1} title={step.title} text={step.text} />
              <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_15rem] lg:gap-10">
                <figure>
                  <ScreenLabel who="you" />
                  <BrowserFrame image={step.you.image} alt={step.you.alt} sizes="(min-width: 1152px) 830px, 100vw" />
                </figure>
                <figure className="mx-auto w-full max-w-60 lg:max-w-none">
                  <ScreenLabel who="team" />
                  <PhoneFrame image={step.team.image} alt={step.team.alt} sizes="240px" />
                </figure>
              </div>
            </li>
          ))}
          <li>
            <StepHeading
              number={steps.length + 1}
              title="Hours and sharing"
              text="Check everyone's hours, then download the schedule as a PDF, image, Word or Excel file."
            />
            <div className="mt-6 grid items-start gap-8 lg:grid-cols-[3fr_2fr] lg:gap-10">
              <figure>
                <ScreenLabel who="you" />
                <BrowserFrame
                  image={reportsShot}
                  alt="The Reports page: hours and shifts per person, and download buttons for PDF, PNG, JPG, Word and Excel."
                  sizes="(min-width: 1152px) 640px, 100vw"
                />
              </figure>
              <figure>
                <ScreenLabel who="team" text="Your team gets" />
                <Image
                  src={exportShot}
                  alt="A downloaded schedule image with the week's shifts and each person's hours, ready for the team chat."
                  sizes="(min-width: 1152px) 430px, 100vw"
                  className="h-auto w-full rounded-xl border bg-white shadow-xl shadow-navy/10"
                />
              </figure>
            </div>
          </li>
        </ol>
      </Section>

      {/* Smaller things that come with it */}
      <Section title="Also included">
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {extras.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-mint text-teal-dark">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-base">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}

function StepHeading({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal font-heading font-semibold text-navy">{number}</span>
      <div className="max-w-2xl">
        <h3 className="text-xl sm:text-2xl">{title}</h3>
        <p className="mt-2 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

/** "You see" (laptop) or "Your team sees" (phone) above a screen. */
function ScreenLabel({ who, text }: { who: "you" | "team"; text?: string }) {
  const Icon = who === "you" ? LaptopIcon : SmartphoneIcon;
  return (
    <figcaption
      className={cn(
        "mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
        who === "you" ? "bg-navy text-white" : "bg-mint text-teal-dark ring-1 ring-teal/30",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {text ?? (who === "you" ? "You see" : "Your team sees")}
    </figcaption>
  );
}

/** A small, illustrative week grid (decorative, so hidden from screen readers). */
function SchedulePreview() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const afternoon = [["Ana", "Dev"], ["Ben", "Hana"], ["Cara", "Eli"], ["Dev", "Hana"], ["Ana", "Owner"], ["Cara", "Fay"], ["Eli", "Ana"]];
  const evening = [["Ben", "Owner"], ["Gus", "Ana"], ["Ben", "Cara"], ["Ben", "Owner"], ["Gus", "Eli"], ["Fay", "Ana"], ["Cara", "Gus"]];

  return (
    <div aria-hidden className="rounded-2xl bg-white p-4 text-navy shadow-2xl shadow-black/30">
      <div className="flex items-center justify-between border-b pb-3">
        <span className="font-heading font-semibold">Week of Jun 8</span>
        <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-teal-dark">
          Fair · ready to publish
        </span>
      </div>
      {/* Phones show Mon–Thu so names stay readable; larger screens show the whole week. */}
      <div className="mt-3 grid grid-cols-[3rem_repeat(4,minmax(0,1fr))] gap-1 text-xs sm:grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]">
        <span />
        {days.map((d, i) => (
          <span key={d} className={cn("text-center font-semibold text-slate-500", i >= 4 && "hidden sm:block")}>
            {d}
          </span>
        ))}
        {[
          ["12–5", afternoon],
          ["5–9", evening],
        ].map(([label, rows]) => (
          <Row key={label as string} label={label as string} rows={rows as string[][]} />
        ))}
      </div>
    </div>
  );
}

function Row({ label, rows }: { label: string; rows: string[][] }) {
  return (
    <>
      <span className="self-center font-semibold text-slate-500">{label}</span>
      {rows.map((people, i) => (
        <span key={i} className={cn("flex-col gap-0.5 rounded-md bg-slate-50 p-1", i >= 4 ? "hidden sm:flex" : "flex")}>
          {people.map((p) => (
            <span
              key={p}
              className={
                p === "Owner"
                  ? "truncate rounded bg-violet-100 px-1 text-violet-800"
                  : "truncate rounded border bg-white px-1"
              }
            >
              {p}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
