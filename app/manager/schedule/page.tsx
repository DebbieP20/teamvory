import type { Metadata } from "next";
import Link from "next/link";
import { WeekSwitcher } from "@/components/app/week-switcher";
import { type Candidate, type GridShift, ScheduleGrid } from "@/components/shifts/schedule-grid";
import { resolveDay } from "@/lib/availability";
import { loadWeek } from "@/lib/availability-data";
import { formatWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { coversShift, describeShift, hoursOf, overlaps, timeRows, unavailableReason } from "@/lib/schedule";
import { daysOf, findWeek, loadShifts, selectedWeek } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ searchParams }: PageProps<"/manager/schedule">) {
  const { membership } = await requireManager();
  const { weeks, selected, monday } = await selectedWeek(membership.businessId, (await searchParams).week);
  const week = await findWeek(membership.businessId, monday);
  const shifts = await loadShifts(week?.id);

  if (!shifts.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl">Schedule</h1>
        <WeekSwitcher basePath="/manager/schedule" weeks={weeks} selected={selected} />
        <div className="rounded-xl border bg-white p-6">
          <h2 className="text-lg">No shifts for {formatWeek(monday)} yet</h2>
          <p className="mt-1 text-muted-foreground">Set up the week&apos;s shifts first, then come back to assign people.</p>
          <Link
            href={`/manager/shifts?week=${selected}`}
            className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 font-semibold text-navy hover:bg-teal/90"
          >
            Set up shifts
          </Link>
        </div>
      </div>
    );
  }

  const [people, draft] = await Promise.all([
    db.membership.findMany({
      where: { businessId: membership.businessId, status: "ACTIVE", schedulingMode: { not: "NOT_SCHEDULED" } },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    db.schedule.findFirst({
      where: { weekId: week!.id, status: "DRAFT" },
      include: { assignments: { include: { membership: { include: { user: { select: { name: true } } } } } } },
    }),
  ]);
  const availability = await loadWeek(people.map((p) => p.id), monday);
  const assignments = draft?.assignments ?? [];
  const shiftById = new Map(shifts.map((s) => [s.id, s]));

  const dayFor = (personId: string, date: string) => {
    const a = availability.get(personId);
    return a ? resolveDay(date, a.template, a.overrides, a.timeOff) : null;
  };

  // Each person's hours and shifts this week.
  const hours = new Map<string, number>();
  for (const a of assignments) {
    const s = shiftById.get(a.shiftId);
    if (s) hours.set(a.membershipId, (hours.get(a.membershipId) ?? 0) + hoursOf(s));
  }

  const conflicts: string[] = [];
  const gridShifts: GridShift[] = shifts.map((shift) => {
    const onShift = assignments.filter((a) => a.shiftId === shift.id);
    const assigned = onShift.map((a) => {
      const day = dayFor(a.membershipId, shift.date);
      // Availability changed after they were assigned (and nobody confirmed an exception).
      const conflict = !a.override && (!day || !coversShift(day, shift));
      if (conflict) {
        conflicts.push(`${a.membership.user.name} is on ${describeShift(shift)} but isn't available any more (${day ? unavailableReason(day) : "inactive"}).`);
      }
      return {
        id: a.id,
        membershipId: a.membershipId,
        name: a.membership.user.name,
        isOwner: a.membership.role === "OWNER",
        pinned: a.pinned,
        override: a.override,
        conflict,
      };
    });

    const candidates: Candidate[] = people
      .filter((p) => !onShift.some((a) => a.membershipId === p.id))
      .map((p) => {
        const day = dayFor(p.id, shift.date);
        const clash = assignments.find((a) => {
          const other = shiftById.get(a.shiftId);
          return a.membershipId === p.id && other && overlaps(shift, other);
        });
        const base = { membershipId: p.id, name: p.user.name, isOwner: p.role === "OWNER", hours: hours.get(p.id) ?? 0 };
        if (clash) {
          return { ...base, status: "blocked" as const, reason: `Already working ${describeShift(shiftById.get(clash.shiftId)!)}` };
        }
        if (day && coversShift(day, shift)) return { ...base, status: "available" as const, reason: null };
        return { ...base, status: "unavailable" as const, reason: day ? unavailableReason(day) : "Not available" };
      })
      .sort((a, b) => {
        const order = { available: 0, unavailable: 1, blocked: 2 };
        // Available people with the fewest hours first, then the owner as backup (decision 19).
        return order[a.status] - order[b.status] || Number(a.isOwner) - Number(b.isOwner) || a.hours - b.hours || a.name.localeCompare(b.name);
      });

    return { ...shift, label: describeShift(shift), assigned, candidates };
  });

  const short = gridShifts.filter((s) => s.assigned.length < s.requiredCount);
  const totalNeeded = shifts.reduce((n, s) => n + s.requiredCount, 0);
  const totalFilled = gridShifts.reduce((n, s) => n + Math.min(s.assigned.length, s.requiredCount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            Draft for {formatWeek(monday)}: {totalFilled} of {totalNeeded} spots filled. Your team can&apos;t see it until you publish (coming
            next).
          </p>
        </div>
        <Link href={`/manager/shifts?week=${selected}`} className="text-sm font-semibold text-teal-dark hover:underline">
          Change shifts
        </Link>
      </div>

      <WeekSwitcher basePath="/manager/schedule" weeks={weeks} selected={selected} />

      {(short.length > 0 || conflicts.length > 0) && (
        <section aria-labelledby="attention-heading" className="space-y-2">
          <h2 id="attention-heading" className="sr-only">Needs attention</h2>
          <ul className="space-y-2">
            {conflicts.map((c) => (
              <li key={c} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
                ⚠ {c}
              </li>
            ))}
            {/* A few open shifts are listed; many are summarized (the grid shows them in red). */}
            {short.length > 3 ? (
              <li className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-destructive">
                {short.length} shifts still need people. They&apos;re marked in red below.
              </li>
            ) : (
              short.map((s) => (
                <li key={s.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-destructive">
                  {s.label} needs {s.requiredCount - s.assigned.length} more
                  {s.candidates.some((c) => c.status === "available") ? "" : " (nobody else is available)"}
                </li>
              ))
            )}
          </ul>
        </section>
      )}
      {short.length === 0 && conflicts.length === 0 && (
        <p role="status" className="rounded-lg border border-teal/40 bg-mint px-4 py-2 text-sm text-teal-dark">
          ✓ Every shift is filled.
        </p>
      )}

      <div className="space-y-8">
        <ScheduleGrid days={daysOf(monday)} rows={timeRows(shifts)} shifts={gridShifts} />

        <aside aria-labelledby="hours-heading" className="space-y-3">
          <h2 id="hours-heading" className="text-lg">Hours this week</h2>
          <ul className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {people.map((p) => {
              const h = hours.get(p.id) ?? 0;
              const count = assignments.filter((a) => a.membershipId === p.id).length;
              return (
                <li key={p.id} className="flex justify-between gap-2 bg-white px-4 py-2 text-sm">
                  <span>
                    {p.user.name}
                    {p.role === "OWNER" && <span className="text-muted-foreground"> (owner)</span>}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    <strong className="text-navy">{Number.isInteger(h) ? h : h.toFixed(2)} h</strong> · {count} shift{count === 1 ? "" : "s"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">Fair targets based on availability come with the auto-scheduler.</p>
        </aside>
      </div>
    </div>
  );
}
