import { CalendarCheckIcon, CalendarClockIcon } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function EmployeeHome() {
  const { user, membership } = await requireEmployee();
  const hasDefaultWeek = (await db.availabilityTemplate.count({ where: { membershipId: membership.id } })) > 0;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">You&apos;re part of {membership.businessName} on TeamVory.</p>
      </div>
      <Link
        href="/employee/availability"
        className={
          hasDefaultWeek
            ? "flex items-start gap-4 rounded-xl border bg-white p-6 hover:border-teal"
            : "flex items-start gap-4 rounded-xl border border-teal/40 bg-mint p-6 hover:border-teal"
        }
      >
        <CalendarCheckIcon className="size-8 shrink-0 text-teal-dark" aria-hidden />
        <div>
          <h2 className="text-lg">{hasDefaultWeek ? "My availability" : "Set your availability"}</h2>
          <p className="mt-1 text-muted-foreground">
            {hasDefaultWeek
              ? "Change a week, or add time off."
              : "Tell your manager when you can usually work. It takes a minute, and you only do it once."}
          </p>
        </div>
      </Link>
      <section className="flex items-start gap-4 rounded-xl border bg-white p-6">
        <CalendarClockIcon className="size-8 shrink-0 text-teal" aria-hidden />
        <div>
          <h2 className="text-lg">Your schedule will appear here</h2>
          <p className="mt-1 text-muted-foreground">
            You&apos;ll see your shifts here once your manager publishes the schedule.
          </p>
        </div>
      </section>
    </div>
  );
}
