import { ArrowRightIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { WeekSwitcher } from "@/components/app/week-switcher";
import { AddShiftForm, ApplyPatternForm, CopyLastWeekForm, ShiftRowForm } from "@/components/shifts/setup-forms";
import { formatDay, formatTime, formatWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { hoursOf } from "@/lib/schedule";
import { daysOf, findWeek, loadPatterns, loadShifts, selectedWeek } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Shift setup" };

const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(2).replace(/0$/, "")} h`;

export default async function ShiftSetupPage({ searchParams }: PageProps<"/manager/shifts">) {
  const { membership } = await requireManager();
  const { weeks, selected, monday } = await selectedWeek(membership.businessId, (await searchParams).week);
  const week = await findWeek(membership.businessId, monday);
  const [shifts, patterns, assignedCounts] = await Promise.all([
    loadShifts(week?.id),
    loadPatterns(membership.businessId),
    week
      ? db.assignment.groupBy({ by: ["shiftId"], where: { schedule: { weekId: week.id, status: "DRAFT" } }, _count: true })
      : Promise.resolve([]),
  ]);
  const assigned = new Map(assignedCounts.map((a) => [a.shiftId, a._count]));
  const days = daysOf(monday);
  const totalHours = shifts.reduce((sum, s) => sum + hoursOf(s) * s.requiredCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Shift setup</h1>
          <p className="mt-1 text-muted-foreground">The shifts you need and how many people each one needs.</p>
        </div>
        <Link href="/manager/shifts/patterns" className="text-sm font-semibold text-teal-dark hover:underline">
          Manage patterns
        </Link>
      </div>

      <WeekSwitcher basePath="/manager/shifts" weeks={weeks} selected={selected} />

      <section aria-labelledby="quick-heading" className="space-y-4 rounded-xl border bg-white p-4 sm:p-6">
        <h2 id="quick-heading" className="text-lg">Set up {formatWeek(monday)}</h2>
        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">The usual one-click start:</p>
            <CopyLastWeekForm monday={monday} hasShifts={shifts.length > 0} />
          </div>
          <div className="space-y-1 lg:border-l lg:pl-6">
            <p className="text-sm text-muted-foreground">Or apply a pattern to some days, e.g. Slow day when rain is forecast:</p>
            <ApplyPatternForm
              monday={monday}
              days={days.map((d) => ({ date: d, label: formatDay(d), hasShifts: shifts.some((s) => s.date === d) }))}
              patterns={patterns.map((p) => ({
                id: p.id,
                name: p.name,
                summary: p.shifts.map((s) => `${formatTime(s.start)}–${formatTime(s.end)} ×${s.required}`).join(", "),
              }))}
            />
            {patterns.length === 0 && (
              <p className="text-sm">
                No patterns yet.{" "}
                <Link href="/manager/shifts/patterns" className="font-semibold text-teal-dark hover:underline">
                  Create one
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </section>

      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((date) => {
          const dayShifts = shifts.filter((s) => s.date === date);
          return (
            <li key={date} className="space-y-2 rounded-xl border bg-slate-100/60 p-3" aria-label={formatDay(date)}>
              <h3 className="flex justify-between text-base">
                {formatDay(date)}
                <span className="text-sm font-normal text-muted-foreground">
                  {dayShifts.length ? fmtHours(dayShifts.reduce((h, s) => h + hoursOf(s) * s.requiredCount, 0)) : "No shifts"}
                </span>
              </h3>
              {dayShifts.map((s) => (
                <ShiftRowForm key={s.id} shift={s} assigned={assigned.get(s.id) ?? 0} />
              ))}
              <AddShiftForm date={date} label={formatDay(date)} />
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3">
        <span>
          Staff hours needed: <strong>{fmtHours(totalHours)}</strong>
        </span>
        <Link
          href={`/manager/schedule?week=${selected}`}
          className="inline-flex items-center gap-1 rounded-lg bg-navy px-4 py-2 font-semibold text-white hover:bg-navy/90"
        >
          Next: build the schedule <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}
