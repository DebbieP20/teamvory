import {
  ArrowRightIcon,
  ArrowRightLeftIcon,
  BellRingIcon,
  CalendarCheckIcon,
  FileDownIcon,
  ScaleIcon,
  SunIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { BrowserFrame, PhoneFrame } from "@/components/site/screens";
import { CtaBand, Section } from "@/components/site/sections";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import dashboardShot from "@/public/screenshots/dashboard.webp";
import exportShot from "@/public/screenshots/export.webp";
import phoneAvailabilityShot from "@/public/screenshots/phone-availability.webp";
import phoneScheduleShot from "@/public/screenshots/phone-schedule.webp";
import phoneShiftsShot from "@/public/screenshots/phone-shifts.webp";
import reportsShot from "@/public/screenshots/reports.webp";
import scheduleShot from "@/public/screenshots/schedule.webp";

const steps = [
  {
    title: "Your team sets their availability",
    text: "Employees submit their regular availability from their phone. They only need to update it when their schedule changes or they request time off.",
  },
  {
    title: "Generate a fair schedule",
    text: "TeamVory assigns employees based on availability, business needs, and fair distribution of hours. Prefer to stay in control? You can assign shifts manually.",
  },
  {
    title: "Publish, and you're done",
    text: "Publish the schedule and your team receives an email with their shifts. Shift swaps and open shifts can be managed right in the app.",
  },
];

const phones = [
  {
    image: phoneScheduleShot,
    caption: "My schedule",
    alt: "An employee's phone showing their shifts for this week and next, each with a \"Can't make it?\" link.",
  },
  {
    image: phoneShiftsShot,
    caption: "Open shifts and swaps",
    alt: "The Shifts page on a phone: an open shift to pick up and a swap request to accept or decline.",
  },
  {
    image: phoneAvailabilityShot,
    caption: "Availability",
    alt: "The availability page on a phone: Off, All day or Custom for each day of the week.",
  },
];

const features = [
  {
    icon: ScaleIcon,
    title: "Fair auto-scheduling",
    text: "Distribute hours fairly based on employee availability and your staffing needs. Adjust and regenerate schedules until they work for your team.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Availability & time off",
    text: "Set recurring availability, make changes for specific weeks, and request time off, all from a phone.",
  },
  {
    icon: ArrowRightLeftIcon,
    title: "Swaps & open shifts",
    text: "Let employees trade shifts or pick up available ones, with manager approval when needed.",
  },
  {
    icon: SunIcon,
    title: "Adapts as you change",
    text: "TeamVory helps you organize your team and adapt your schedules as your needs change.",
  },
  {
    icon: BellRingIcon,
    title: "Availability reminders",
    text: "Send automatic email reminders to employees who haven't submitted their availability yet.",
  },
  {
    icon: FileDownIcon,
    title: "Print or share",
    text: "Download schedules in PDF, image, Word, or Excel formats, ready to post, print, or share.",
  },
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
              Spend less time collecting availability, balancing hours, and building schedules. TeamVory helps you organize your team so you can focus on running your business.
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
                <Link href="/how-it-works">
                  See how it works <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
          <SchedulePreview />
        </div>
      </section>

      {/* Problem → solution */}
      <Section title="Sound familiar?">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-lg">Today</h3>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              <li>Staff text you their availability, one by one.</li>
              <li>You copy everything into a spreadsheet.</li>
              <li>You calculate hours manually to keep things fair.</li>
              <li>You build the schedule cell by cell, every week.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-teal/40 bg-mint p-6">
            <h3 className="text-lg">With TeamVory</h3>
            <ul className="mt-4 space-y-3 text-navy/80">
              <li>Your team submits availability right in the app.</li>
              <li>You set the shifts your business needs.</li>
              <li>TeamVory distributes hours fairly based on availability.</li>
              <li>You publish the schedule, and everyone gets an email.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* How it works */}
      <Section title="How it works" tone="gray">
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className="grid size-9 place-items-center rounded-full bg-teal font-heading font-semibold text-navy">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/how-it-works"
          className="mt-10 inline-flex items-center gap-1 font-semibold text-teal-dark hover:underline"
        >
          See the full weekly cycle <ArrowRightIcon className="size-4" />
        </Link>
      </Section>

      {/* Real screens */}
      <Section title="See it in action" intro="Real screens from TeamVory, with a sample café and its team of seven.">
        <div className="space-y-16 sm:space-y-24">
          <TourRow
            wide
            title="Build a fair week in one click"
            text="Set the shifts you need and press Build schedule. TeamVory fills every spot from your team's availability and shares the hours fairly. Move anyone by hand, then publish: everyone gets an email."
          >
            <BrowserFrame
              image={scheduleShot}
              alt="The Schedule page: next week with every spot filled, two people per shift, and a birthday party shift on Saturday in violet."
              sizes="(min-width: 1152px) 1104px, 100vw"
            />
          </TourRow>

          <TourRow
            wide
            title="Your team has it on their phone"
            text="Employees see their shifts, tell you when they can work, and pick up or swap shifts. There's nothing to install: it works in any phone browser."
          >
            {/* Phones swipe sideways on small screens; larger screens show all three. */}
            <div
              role="region"
              aria-label="Phone screens"
              tabIndex={0}
              className="-mx-4 scroll-px-4 overflow-x-auto px-4 pb-2 sm:mx-auto sm:max-w-4xl sm:overflow-visible sm:px-0"
            >
              <ul className="flex snap-x snap-mandatory gap-5 sm:grid sm:grid-cols-3 sm:gap-8">
                {phones.map((p) => (
                  <li key={p.caption} className="w-[70%] shrink-0 snap-start sm:w-auto">
                    <PhoneFrame image={p.image} alt={p.alt} sizes="(min-width: 640px) 280px, 70vw" />
                    <p className="mt-3 text-center text-sm font-semibold">{p.caption}</p>
                  </li>
                ))}
              </ul>
            </div>
          </TourRow>

          <TourRow
            reverse
            title="See what needs you"
            text="Both weeks at a glance, plus anything waiting on you: open shifts, swaps to approve and upcoming events."
          >
            <BrowserFrame
              image={dashboardShot}
              alt="The owner's dashboard: this week and next week published, an open shift that needs attention, and an upcoming event."
              sizes="(min-width: 1024px) 720px, 100vw"
            />
          </TourRow>

          <TourRow
            title="Hours and downloads"
            text="Check everyone's hours for the week, then download the schedule as a PDF, image, Word or Excel file, ready to print or share in the team chat."
          >
            <div className="relative lg:pb-20">
              <BrowserFrame
                image={reportsShot}
                alt="The Reports page: hours and shifts per person, and download buttons for PDF, PNG, JPG, Word and Excel."
                sizes="(min-width: 1024px) 720px, 100vw"
              />
              <Image
                src={exportShot}
                alt="A downloaded schedule image with the week's shifts and each person's hours."
                sizes="320px"
                className="absolute bottom-0 -left-10 hidden h-auto w-1/2 rounded-lg border shadow-2xl shadow-navy/25 lg:block"
              />
            </div>
          </TourRow>
        </div>
      </Section>

      {/* Features */}
      <Section title="Everything your team needs" tone="gray">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="rounded-xl border bg-white p-6">
              <span className="grid size-10 place-items-center rounded-lg bg-mint text-teal-dark">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand />
    </>
  );
}

/** One stop of the screen tour: text beside a screenshot (sides swapped with `reverse`), or above it when `wide`. */
function TourRow({ title, text, reverse, wide, children }: { title: string; text: string; reverse?: boolean; wide?: boolean; children: React.ReactNode }) {
  if (wide) {
    return (
      <div>
        <div className="max-w-2xl">
          <h3 className="text-xl sm:text-2xl">{title}</h3>
          <p className="mt-3 text-muted-foreground">{text}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    );
  }
  return (
    <div className={cn("grid items-center gap-8 lg:gap-12", reverse ? "lg:grid-cols-[2fr_1fr]" : "lg:grid-cols-[1fr_2fr]")}>
      <div className={cn(reverse && "lg:order-last")}>
        <h3 className="text-xl sm:text-2xl">{title}</h3>
        <p className="mt-3 text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
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
