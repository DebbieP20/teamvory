import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DefaultWeekForm } from "@/components/availability/default-week-form";
import { deadlineText } from "@/components/availability/deadline-text";
import { TimeOffSection } from "@/components/availability/time-off-section";
import { WeekView } from "@/components/availability/week-view";
import { type DaySetting, editableWeeks } from "@/lib/availability";
import { authorizeAvailability, loadWeek, today } from "@/lib/availability-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Edit availability" };

// A manager entering availability and time off on someone's behalf (decision 8).
export default async function EditAvailabilityPage({ params, searchParams }: PageProps<"/manager/availability/[membershipId]">) {
  await requireManager();
  const { membershipId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) notFound();
  const access = await authorizeAvailability(membershipId);
  if (!access) notFound();

  const selected = (await searchParams).week === "next" ? "next" : "this";
  const now = today(access.settings);
  const weeks = editableWeeks(now.date);
  const monday = selected === "next" ? weeks.nextWeek : weeks.thisWeek;
  const data = (await loadWeek([membershipId], monday)).get(membershipId)!;
  const days: DaySetting[] = Array.from({ length: 7 }, (_, i) => data.template.get(i + 1) ?? { kind: "OFF" });
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
            You&apos;re changing this for {access.target.name}. As a manager, the availability deadline doesn&apos;t apply to you.
          </p>
        )}
      </div>

      <section aria-labelledby="default-heading" className="space-y-3">
        <h2 id="default-heading" className="text-lg">Default week</h2>
        <DefaultWeekForm membershipId={membershipId} days={days} />
      </section>

      <section aria-labelledby="week-heading" className="space-y-3">
        <h2 id="week-heading" className="text-lg">This & next week</h2>
        <WeekView
          membershipId={membershipId}
          basePath={`/manager/availability/${membershipId}`}
          weeks={weeks}
          selected={selected}
          data={data}
          locked={false}
          deadlineText={deadlineText(monday, access.settings.deadline)}
          todayDate={now.date}
        />
      </section>

      <section aria-labelledby="timeoff-heading" className="space-y-3">
        <h2 id="timeoff-heading" className="text-lg">Time off</h2>
        <TimeOffSection membershipId={membershipId} todayDate={now.date} approvalRequired={false} canRemove />
      </section>
    </div>
  );
}
