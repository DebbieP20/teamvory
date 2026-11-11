import type { Metadata } from "next";
import { deadlineText } from "@/components/availability/deadline-text";
import { WeekView } from "@/components/availability/week-view";
import { editableWeeks, isWeekLocked } from "@/lib/availability";
import { getBusinessSettings, loadWeek, today } from "@/lib/availability-data";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "This & next week" };

export default async function WeekPage({ searchParams }: PageProps<"/employee/availability/week">) {
  const { membership } = await requireEmployee();
  const selected = (await searchParams).week === "next" ? "next" : "this";
  const settings = await getBusinessSettings(membership.businessId);
  const now = today(settings);
  const weeks = editableWeeks(now.date);
  const monday = selected === "next" ? weeks.nextWeek : weeks.thisWeek;
  const data = (await loadWeek([membership.id], monday)).get(membership.id)!;

  return (
    <>
      <p className="text-muted-foreground">Change a day for one week only. Your default week stays the same.</p>
      <WeekView
        membershipId={membership.id}
        basePath="/employee/availability/week"
        weeks={weeks}
        selected={selected}
        data={data}
        locked={isWeekLocked(monday, settings.deadline, now)}
        deadlineText={deadlineText(monday, settings.deadline)}
        todayDate={now.date}
      />
    </>
  );
}
