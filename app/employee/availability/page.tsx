import type { Metadata } from "next";
import { WeekSection } from "@/components/availability/week-section";
import { sendableWeeks } from "@/lib/availability";
import { getBusinessSettings, today } from "@/lib/availability-data";
import { formatWeek } from "@/lib/dates";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "My availability" };

/** The coming week: the one the manager is scheduling now. */
export default async function SendWeekPage() {
  const { membership } = await requireEmployee();
  const settings = await getBusinessSettings(membership.businessId);
  const now = today(settings);
  const { first } = sendableWeeks(now.date);
  return (
    <>
      <p className="text-muted-foreground">
        When can you work {formatWeek(first)}? Choose an option for every day, then send it to your manager.
      </p>
      <WeekSection membershipId={membership.id} monday={first} settings={settings} now={now} asManager={false} />
    </>
  );
}
