import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RequestButton } from "@/components/requests/request-forms";
import { ResultBanner } from "@/components/requests/result-banner";
import { addDays, formatDay, formatTime, formatWeek } from "@/lib/dates";
import { db } from "@/lib/db";
import { hasUnpublishedChanges } from "@/lib/publish";
import { describeShift } from "@/lib/schedule";
import { draftSnapshot, findWeek, loadEvents, loadPublished, publishedConflicts, selectedWeek } from "@/lib/schedule-data";
import { reviewRequest } from "@/lib/request-actions";
import { activeRequests } from "@/lib/requests-data";
import { requireManager } from "@/lib/session";
import { startsSoon } from "@/lib/swaps";
import { cn } from "@/lib/utils";

/** This week (running) and next week (being built), as in wireframe 4. */
async function weekCard(businessId: string, monday: string, param: "this" | "next", label: string) {
  const week = await findWeek(businessId, monday);
  const [draft, published] = week ? await Promise.all([draftSnapshot(week.id), loadPublished(week.id)]) : [null, null];
  const shifts = draft?.shifts ?? [];
  const needed = shifts.reduce((n, s) => n + s.requiredCount, 0);
  const filled = shifts.reduce((n, s) => n + Math.min(s.people.length, s.requiredCount), 0);
  const status = !shifts.length
    ? { tag: "Not set up", tone: "bg-slate-200 text-navy", text: "No shifts yet.", action: "Set up shifts", href: `/manager/shifts?week=${param}` }
    : !published
      ? { tag: "Draft", tone: "bg-slate-200 text-navy", text: `${filled} of ${needed} spots filled. Not published yet: the team can't see it.`, action: "Finish & publish", href: `/manager/schedule?week=${param}` }
      : hasUnpublishedChanges(published.snapshot, draft!)
        ? { tag: "Unpublished changes", tone: "bg-amber-100 text-amber-900", text: `${filled} of ${needed} spots filled. The team still sees version ${published.version}.`, action: "Publish changes", href: `/manager/schedule?week=${param}` }
        : { tag: "Published", tone: "bg-mint text-teal-dark", text: `${filled} of ${needed} spots filled. Everyone has been emailed.`, action: "Open schedule", href: `/manager/schedule?week=${param}` };
  return { label: `${label} · ${formatWeek(monday)}`, ...status };
}

export const metadata: Metadata = { title: "Dashboard" };

export default async function ManagerDashboard() {
  const { user, membership } = await requireManager();
  const { weeks, now: localNow } = await selectedWeek(membership.businessId, undefined);
  const [cards, conflicts, { requests, now }, events] = await Promise.all([
    Promise.all([
      weekCard(membership.businessId, weeks.thisWeek, "this", "This week"),
      weekCard(membership.businessId, weeks.nextWeek, "next", "Next week"),
    ]),
    publishedConflicts(membership.businessId),
    activeRequests(membership.businessId),
    loadEvents(membership.businessId, localNow.date),
  ]);
  // Events in the next two weeks (wireframe 4); flagged while they need a shift.
  const upcomingEvents = events.filter((e) => e.date <= addDays(now.date, 14));
  const approvals = requests.filter((r) => r.status === "PENDING_APPROVAL");
  const openShifts = requests.filter((r) => r.type === "COVERAGE" && r.status === "OPEN");
  const attention = conflicts.length + approvals.length + openShifts.length;
  const [teamCount, pendingInvites, missingAvailability, pendingTimeOff, hasShifts, hasAssignments, hasPublished] = await Promise.all([
    db.membership.count({ where: { businessId: membership.businessId, status: "ACTIVE", role: { not: "OWNER" } } }),
    db.invitation.count({
      where: { businessId: membership.businessId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    }),
    db.membership.count({
      where: {
        businessId: membership.businessId,
        status: "ACTIVE",
        schedulingMode: { not: "NOT_SCHEDULED" },
        availabilityTemplate: { none: {} },
      },
    }),
    db.timeOff.count({ where: { status: "PENDING", membership: { businessId: membership.businessId } } }),
    db.shift.count({ where: { week: { businessId: membership.businessId } } }).then((n) => n > 0),
    db.assignment.count({ where: { schedule: { week: { businessId: membership.businessId } } } }).then((n) => n > 0),
    db.schedule.count({ where: { status: { not: "DRAFT" }, week: { businessId: membership.businessId } } }).then((n) => n > 0),
  ]);

  const steps = [
    { done: true, label: "Create your business", href: null },
    {
      done: teamCount > 0,
      label:
        teamCount > 0
          ? `Invite your team (${teamCount} joined${pendingInvites ? `, ${pendingInvites} invited` : ""})`
          : pendingInvites
            ? `Invite your team (${pendingInvites} invited, waiting for them to join)`
            : "Invite your team",
      href: "/manager/employees",
    },
    {
      done: teamCount > 0 && missingAvailability === 0,
      label:
        teamCount > 0 && missingAvailability > 0
          ? `Collect availability (${missingAvailability} ${missingAvailability === 1 ? "person hasn't" : "people haven't"} set it yet)`
          : "Collect availability",
      href: "/manager/availability",
    },
    { done: hasShifts, label: "Set up this week's shifts", href: "/manager/shifts" },
    { done: hasAssignments, label: "Build the schedule", href: "/manager/schedule" },
    { done: hasPublished, label: "Publish it (your team gets an email)", href: "/manager/schedule" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted-foreground">{membership.businessName}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <section key={c.label} aria-label={c.label} className="flex flex-col gap-2 rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg">{c.label}</h2>
              <span className={cn("rounded px-2 py-0.5 text-sm font-semibold", c.tone)}>{c.tag}</span>
            </div>
            <p className="text-muted-foreground">{c.text}</p>
            <Link href={c.href} className="mt-auto font-semibold text-teal-dark hover:underline">
              {c.action} →
            </Link>
          </section>
        ))}
      </div>

      <ResultBanner>
        {attention > 0 && (
          <section aria-labelledby="attention-heading" className="space-y-2">
            <h2 id="attention-heading" className="text-lg">Needs your attention</h2>
            <ul className="space-y-2">
              {approvals.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal/40 bg-white px-5 py-3">
                  <div>
                    <div className="font-semibold">{r.type === "SWAP" ? "Swap to approve" : "Pickup to approve"}</div>
                    <div className="text-sm">
                      {r.type === "SWAP"
                        ? `${r.requester.user.name} takes ${describeShift(r.targetShift!)}, ${r.targetMembership!.user.name} takes ${describeShift(r.shift)}. Both agreed.`
                        : `${r.pickedUpBy!.user.name} takes ${r.requester.user.name}'s ${describeShift(r.shift)}.`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <RequestButton action={reviewRequest} fields={{ requestId: r.id, decision: "approve" }} label="Approve" pendingText="Approving…" />
                    <RequestButton
                      action={reviewRequest}
                      fields={{ requestId: r.id, decision: "decline" }}
                      label="Decline"
                      pendingText="Declining…"
                      variant="secondary"
                    />
                  </div>
                </li>
              ))}
              {openShifts.map((r) => {
                const soon = startsSoon(r.shift, now);
                return (
                  <li key={r.id}>
                    <Link
                      href={`/manager/schedule?week=${r.monday === weeks.nextWeek ? "next" : "this"}`}
                      className={cn(
                        "block rounded-xl border px-5 py-3 hover:bg-slate-50",
                        soon ? "border-red-200 bg-red-50 text-destructive" : "bg-white",
                      )}
                    >
                      {soon && <strong>Starts soon · </strong>}
                      Open shift: <strong>{describeShift(r.shift)}</strong>, posted by {r.requester.user.name}. Nobody has picked it up yet, so{" "}
                      {r.requester.user.name.split(" ")[0]} still works it.
                    </Link>
                  </li>
                );
              })}
              {conflicts.map((c) => (
                <li key={`${c.scheduleId}-${c.shift.shiftId}-${c.membershipId}`}>
                  <Link
                    href={`/manager/schedule?week=${c.shift.date >= weeks.nextWeek ? "next" : "this"}`}
                    className="block rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-amber-900 hover:bg-amber-100"
                  >
                    ⚠ <strong>{c.name}</strong> can&apos;t work {describeShift(c.shift)} any more ({c.reason}). Find cover →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </ResultBanner>

      {upcomingEvents.length > 0 && (
        <section aria-labelledby="events-heading" className="space-y-2">
          <h2 id="events-heading" className="text-lg">Upcoming events</h2>
          <ul className="divide-y rounded-xl border bg-white">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link href="/manager/events" className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 hover:bg-slate-50">
                  <span>
                    <strong>{formatDay(e.date)}</strong> · {e.title} {formatTime(e.startTime)} – {formatTime(e.endTime)}
                  </span>
                  {e.requiresStaffing && e.shiftCount === 0 && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-sm font-semibold text-amber-900">No shift added yet</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingTimeOff > 0 && (
        <Link
          href="/manager/availability#requests-heading"
          className="block rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 font-medium text-amber-900 hover:bg-amber-100"
        >
          {pendingTimeOff === 1 ? "1 time-off request is" : `${pendingTimeOff} time-off requests are`} waiting for you →
        </Link>
      )}

      {/* Hidden once every step is done. */}
      {!steps.every((s) => s.done) && (
        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg">Getting started</h2>
          <ol className="mt-4 space-y-3">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-3">
                {step.done ? (
                  <CheckCircle2Icon className="size-5 shrink-0 text-teal" aria-label="Done" />
                ) : (
                  <CircleIcon className="size-5 shrink-0 text-slate-300" aria-label="Not done yet" />
                )}
                {step.href ? (
                  <Link href={step.href} className="font-medium text-teal-dark hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  <span className={step.done ? "text-muted-foreground line-through" : ""}>{step.label}</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
