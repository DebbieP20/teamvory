import { CalendarClockIcon } from "lucide-react";
import type { Metadata } from "next";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "Home" };

export default async function EmployeeHome() {
  const { user, membership } = await requireEmployee();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">You&apos;re part of {membership.businessName} on TeamVory.</p>
      </div>
      <section className="flex items-start gap-4 rounded-xl border bg-white p-6">
        <CalendarClockIcon className="size-8 shrink-0 text-teal" aria-hidden />
        <div>
          <h2 className="text-lg">Your schedule will appear here</h2>
          <p className="mt-1 text-muted-foreground">
            Soon you&apos;ll set your availability here, and see your shifts once your manager publishes the schedule.
          </p>
        </div>
      </section>
    </div>
  );
}
