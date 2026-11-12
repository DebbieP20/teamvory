import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostOpenShiftForm, SwapForm } from "@/components/requests/request-forms";
import { formatDay, formatTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { shortName } from "@/lib/schedule";
import { findShift, publishedWeeks } from "@/lib/requests-data";
import { requireEmployee } from "@/lib/session";
import { isUpcoming, swapOptions } from "@/lib/swaps";

export const metadata: Metadata = { title: "Can't make a shift" };

/** Swap with a coworker or post as an open shift (wireframe 5, ⋯ menu and C). */
export default async function ShiftOptionsPage({ params }: PageProps<"/employee/shifts/[shiftId]">) {
  const { membership } = await requireEmployee();
  const { shiftId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(shiftId)) notFound();

  const { now, weeks } = await publishedWeeks(membership.businessId);
  const week = weeks.find((w) => findShift(w, shiftId));
  const shift = week && findShift(week, shiftId);
  if (!week || !shift || !shift.people.some((p) => p.membershipId === membership.id)) notFound();

  const active = await db.shiftRequest.findFirst({
    where: { requesterId: membership.id, shiftId, status: { in: ["OPEN", "PENDING_APPROVAL"] } },
    include: { targetMembership: { include: { user: { select: { name: true } } } } },
  });
  const time = `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;
  const coworkers = new Set(week.employees.filter((e) => e.id !== membership.id).map((e) => e.id));
  const options = swapOptions(week.snapshot, membership.id, shift, coworkers, week.canWork, now).map((o) => ({
    value: `${o.shift.shiftId}:${o.membershipId}`,
    day: formatDay(o.shift.date),
    time: `${formatTime(o.shift.startTime)} – ${formatTime(o.shift.endTime)}`,
    who: shortName(o.name),
  }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/employee" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-dark hover:underline">
        <ArrowLeftIcon className="size-4" aria-hidden /> My schedule
      </Link>
      <div>
        <h1 className="text-2xl sm:text-3xl">Can&apos;t make it?</h1>
        <p className="mt-1 text-lg">
          {formatDay(shift.date)}, {time}
        </p>
        <p className="mt-1 text-muted-foreground">You keep this shift until someone else takes it.</p>
      </div>

      {!isUpcoming(shift, now) ? (
        <p className="rounded-xl border bg-white p-5 text-muted-foreground">This shift has already started.</p>
      ) : active ? (
        <div role="status" className="rounded-xl border border-teal/40 bg-mint p-5">
          <p className="font-medium">
            {active.status === "PENDING_APPROVAL"
              ? "Someone agreed to take it. It's waiting for your manager's approval."
              : active.type === "SWAP"
                ? `You asked ${active.targetMembership!.user.name} to swap. You keep your shift unless they accept.`
                : "Posted as an open shift. Your coworkers who can work it got an email. You keep it until someone picks it up."}
          </p>
          <Link href="/employee/shifts" className="mt-2 inline-block font-semibold text-teal-dark hover:underline">
            See your requests →
          </Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="swap-heading" className="space-y-3 rounded-xl border bg-white p-5">
            <h2 id="swap-heading" className="text-lg">Swap with a coworker</h2>
            <p className="text-sm text-muted-foreground">They take your shift and you take theirs. Only swaps that work for both of you are shown.</p>
            <SwapForm shiftId={shift.shiftId} options={options} />
          </section>
          <section aria-labelledby="post-heading" className="space-y-3 rounded-xl border bg-white p-5">
            <h2 id="post-heading" className="text-lg">Post as an open shift</h2>
            <p className="text-sm text-muted-foreground">Everyone who can work it gets an email. The first person to pick it up gets it.</p>
            <PostOpenShiftForm shiftId={shift.shiftId} />
          </section>
        </>
      )}
    </div>
  );
}
