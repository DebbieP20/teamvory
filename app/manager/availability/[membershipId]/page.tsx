import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TimeOffSection } from "@/components/availability/time-off-section";
import { WeekSection } from "@/components/availability/week-section";
import { WeekSwitcher, managerWeeks, pickWeek } from "@/components/availability/week-switcher";
import { authorizeAvailability, today } from "@/lib/availability-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Edit availability" };

// A manager entering availability and time off on someone's behalf (decision 8).
export default async function EditAvailabilityPage({ params, searchParams }: PageProps<"/manager/availability/[membershipId]">) {
  await requireManager();
  const { membershipId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) notFound();
  const access = await authorizeAvailability(membershipId);
  if (!access) notFound();

  const now = today(access.settings);
  const weeks = managerWeeks(now.date);
  const selected = pickWeek((await searchParams).week);
  const name = access.isSelf ? "Your" : `${access.target.name}'s`;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <Link href={`/manager/availability?week=${selected}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-dark hover:underline">
          <ArrowLeftIcon className="size-4" /> Team availability
        </Link>
        <h1 className="mt-3 text-2xl sm:text-3xl">{name} availability</h1>
        {!access.isSelf && (
          <p className="mt-1 text-muted-foreground">
            You&apos;re entering this for {access.target.name}. As a manager, the availability deadline doesn&apos;t apply to you.
          </p>
        )}
      </div>

      <section aria-labelledby="week-heading" className="space-y-4">
        <h2 id="week-heading" className="text-lg">Availability by week</h2>
        <WeekSwitcher basePath={`/manager/availability/${membershipId}`} weeks={weeks} selected={selected} />
        <WeekSection membershipId={membershipId} monday={weeks[selected]} settings={access.settings} now={now} asManager />
      </section>

      <section aria-labelledby="timeoff-heading" className="space-y-3">
        <h2 id="timeoff-heading" className="text-lg">Time off</h2>
        <TimeOffSection membershipId={membershipId} todayDate={now.date} approvalRequired={false} canRemove />
      </section>
    </div>
  );
}
