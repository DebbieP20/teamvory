import type { Metadata } from "next";
import Link from "next/link";
import { WeekSwitcher } from "@/components/app/week-switcher";
import { BuildForm } from "@/components/shifts/build-form";
import { PublishForm } from "@/components/shifts/publish-form";
import { type Candidate, type GridShift, ScheduleGrid } from "@/components/shifts/schedule-grid";
import { formatWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { coversShift, describeShift, hoursOf, overlaps, timeRows, unavailableReason } from "@/lib/schedule";
import { buildSnapshot, changesByPerson, hasUnpublishedChanges } from "@/lib/publish";
import { daysOf, findWeek, loadPublished, loadSchedulingPeople, loadShifts, selectedWeek } from "@/lib/schedule-data";
import { fairTargets } from "@/lib/scheduler";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Schedule" };

/** 12 → "12 h", 13.33 → "13.3 h" */
const fmtHours = (h: number) => `${Number.isInteger(h) ? h : h.toFixed(1)} h`;

export default async function SchedulePage({ searchParams }: PageProps<"/manager/schedule">) {
  const { membership } = await requireManager();
  const { settings, weeks, selected, monday } = await selectedWeek(membership.businessId, (await searchParams).week);
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

  const [{ people, dayFor }, draft, published] = await Promise.all([
    loadSchedulingPeople(membership.businessId, monday, shifts),
    db.schedule.findFirst({
      where: { weekId: week!.id, status: "DRAFT" },
      include: { assignments: { include: { membership: { include: { user: { select: { name: true } } } } } } },
    }),
    loadPublished(week!.id),
  ]);
  const assignments = draft?.assignments ?? [];
  const shiftById = new Map(shifts.map((s) => [s.id, s]));
  // Fair targets (section 5): the same numbers the auto-scheduler aims for.
  const targets = fairTargets(shifts, people, assignments.filter((a) => a.pinned));

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
        covering: a.covering,
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
        const base = {
          membershipId: p.id,
          name: p.name,
          isOwner: p.role === "OWNER",
          hours: hours.get(p.id) ?? 0,
          target: targets.get(p.id) ?? null,
        };
        if (clash) {
          return { ...base, status: "blocked" as const, reason: `Already working ${describeShift(shiftById.get(clash.shiftId)!)}` };
        }
        if (day && coversShift(day, shift)) return { ...base, status: "available" as const, reason: null };
        return { ...base, status: "unavailable" as const, reason: day ? unavailableReason(day) : "Not available" };
      })
      .sort((a, b) => {
        const order = { available: 0, unavailable: 1, blocked: 2 };
        // Available people furthest below their fair target first; backup people (the owner) last (decision 19).
        const gap = (c: typeof a) => (c.target === null ? -Infinity : c.target - c.hours);
        return order[a.status] - order[b.status] || gap(b) - gap(a) || a.hours - b.hours || a.name.localeCompare(b.name);
      });

    return { ...shift, label: describeShift(shift), assigned, candidates };
  });

  const scale = Math.max(1, ...people.map((p) => Math.max(hours.get(p.id) ?? 0, targets.get(p.id) ?? 0)));

  const short = gridShifts.filter((s) => s.assigned.length < s.requiredCount);
  // The number needed was lowered after people were assigned: the manager picks who comes off.
  const overfull = gridShifts.filter((s) => s.assigned.length > s.requiredCount);
  const totalNeeded = shifts.reduce((n, s) => n + s.requiredCount, 0);
  const totalFilled = gridShifts.reduce((n, s) => n + Math.min(s.assigned.length, s.requiredCount), 0);

  // Publishing: compare the draft with what the team can see.
  const snapshot = buildSnapshot(
    shifts,
    assignments.map((a) => ({ shiftId: a.shiftId, membershipId: a.membershipId, name: a.membership.user.name })),
  );
  const hasChanges = hasUnpublishedChanges(published?.snapshot ?? null, snapshot);
  const affected = published ? changesByPerson(published.snapshot, snapshot).size : 0;
  const problems = [
    short.length && `${short.length} ${short.length === 1 ? "shift still needs" : "shifts still need"} people`,
    overfull.length && `${overfull.length} ${overfull.length === 1 ? "shift has" : "shifts have"} more people than needed`,
  ].filter((p): p is string => !!p);
  const publishedOn = published?.publishedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: settings.timezone }).format(published.publishedAt)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-muted-foreground">
            {formatWeek(monday)}: {totalFilled} of {totalNeeded} spots filled.{" "}
            <Link href={`/manager/shifts?week=${selected}`} className="font-semibold text-teal-dark hover:underline">
              Change shifts
            </Link>
          </p>
          <p role="status" className="mt-2 text-sm">
            {!published ? (
              <span className="rounded bg-slate-200 px-2 py-0.5 font-semibold text-navy">Draft · not published</span>
            ) : hasChanges ? (
              <span className="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                Unpublished changes{affected ? ` for ${affected} ${affected === 1 ? "person" : "people"}` : ""}
              </span>
            ) : (
              <span className="rounded bg-mint px-2 py-0.5 font-semibold text-teal-dark">Published</span>
            )}{" "}
            <span className="text-muted-foreground">
              {!published
                ? "Your team can't see it until you publish."
                : `Version ${published.version}, published ${publishedOn}.${hasChanges ? " Your team still sees that version." : ""}`}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <BuildForm monday={monday} regenerate={assignments.some((a) => a.auto)} />
          <PublishForm monday={monday} firstPublish={!published} hasChanges={hasChanges} problems={problems} />
        </div>
      </div>

      <WeekSwitcher basePath="/manager/schedule" weeks={weeks} selected={selected} />

      {(short.length > 0 || overfull.length > 0 || conflicts.length > 0) && (
        <section aria-labelledby="attention-heading" className="space-y-2">
          <h2 id="attention-heading" className="sr-only">Needs attention</h2>
          <ul className="space-y-2">
            {overfull.map((s) => {
              const extra = s.assigned.length - s.requiredCount;
              return (
                <li key={s.id} className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-destructive">
                  {s.label} has {s.assigned.length} people but needs {s.requiredCount}. Remove {extra} (marked in red below).
                </li>
              );
            })}
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
      {short.length === 0 && overfull.length === 0 && conflicts.length === 0 && (
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
              const target = targets.get(p.id);
              const count = assignments.filter((a) => a.membershipId === p.id).length;
              return (
                <li key={p.id} className="space-y-1.5 bg-white px-4 py-2.5 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>
                      {p.name}
                      {p.role === "OWNER" && <span className="text-muted-foreground"> (owner)</span>}
                    </span>
                    <span className="whitespace-nowrap text-muted-foreground">
                      <strong className="text-navy">{fmtHours(h)}</strong> · {count} shift{count === 1 ? "" : "s"}
                    </span>
                  </div>
                  {target !== undefined ? (
                    <div className="flex items-center gap-2">
                      <div className="relative h-2 flex-1 rounded-full bg-slate-100" aria-hidden>
                        <div className="h-2 rounded-full bg-teal" style={{ width: `${(Math.min(h, scale) / scale) * 100}%` }} />
                        <div className="absolute -top-1 h-4 w-0.5 bg-navy" style={{ left: `${(target / scale) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right text-xs text-muted-foreground">
                        {target > 0 ? `fair: ${fmtHours(target)}` : "not available"}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Backup: covers gaps, no target</p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">
            Bar = hours given. Line = fair share, based on how much each person is available.
          </p>
        </aside>
      </div>
    </div>
  );
}
