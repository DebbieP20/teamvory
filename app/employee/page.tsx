import { CalendarCheckIcon } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { formatDay, formatTime, formatWeek } from "@/lib/dates";
import { shiftsFor } from "@/lib/publish";
import { shortName } from "@/lib/schedule";
import { findWeek, loadPublished, selectedWeek } from "@/lib/schedule-data";
import { requireEmployee } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function EmployeeHome() {
  const { user, membership } = await requireEmployee();
  const hasDefaultWeek = (await db.availabilityTemplate.count({ where: { membershipId: membership.id } })) > 0;
  const { now, weeks } = await selectedWeek(membership.businessId, undefined);
  const schedule = await Promise.all(
    [
      { label: "This week", monday: weeks.thisWeek },
      { label: "Next week", monday: weeks.nextWeek },
    ].map(async (w) => {
      const published = await loadPublished((await findWeek(membership.businessId, w.monday))?.id);
      return { ...w, published: !!published, shifts: shiftsFor(published?.snapshot ?? null, membership.id) };
    }),
  );
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Hi, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">You&apos;re part of {membership.businessName} on TeamVory.</p>
      </div>
      <section aria-labelledby="my-schedule-heading" className="space-y-4">
        <h2 id="my-schedule-heading" className="text-xl">My schedule</h2>
        {schedule.map((w) => (
          <div key={w.monday} className="space-y-2" aria-label={w.label} role="region">
            <h3 className="text-base">
              {w.label} <span className="font-normal text-muted-foreground">· {formatWeek(w.monday)}</span>
            </h3>
            {!w.published ? (
              <p className="rounded-xl border bg-white px-4 py-3 text-muted-foreground">
                Not published yet. You&apos;ll get an email when it is.
              </p>
            ) : w.shifts.length === 0 ? (
              <p className="rounded-xl border bg-white px-4 py-3 text-muted-foreground">You&apos;re not on the schedule this week.</p>
            ) : (
              <ul className="space-y-2">
                {w.shifts.map((s) => {
                  const done = s.date < now.date;
                  const others = s.people.filter((p) => p.membershipId !== membership.id).map((p) => shortName(p.name));
                  return (
                    <li
                      key={s.shiftId}
                      className={cn(
                        "flex items-center gap-4 rounded-xl border bg-white px-4 py-3",
                        s.date === now.date && "border-teal ring-1 ring-teal",
                        done && "opacity-60",
                      )}
                    >
                      <div className="w-24 shrink-0 font-semibold">
                        {s.date === now.date ? "Today" : formatDay(s.date)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium">
                          {formatTime(s.startTime)} – {formatTime(s.endTime)}
                        </div>
                        <div className="text-sm text-muted-foreground">{others.length ? `With ${others.join(", ")}` : "Just you"}</div>
                      </div>
                      {done && <span className="ml-auto text-xs text-muted-foreground">Done</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </section>
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
    </div>
  );
}
