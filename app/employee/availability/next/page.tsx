import type { Metadata } from "next";
import { WeekSection } from "@/components/availability/week-section";
import { sendableWeeks } from "@/lib/availability";
import { getBusinessSettings, today } from "@/lib/availability-data";
import { formatWeek } from "@/lib/dates";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "Next week" };

/** The week after: optional, for people who already know. */
export default async function SendNextWeekPage() {
  const { membership } = await requireEmployee();
  const settings = await getBusinessSettings(membership.businessId);
  const now = today(settings);
  const { second } = sendableWeeks(now.date);
  return (
    <>
      <p className="text-muted-foreground">
        Already know when you can work {formatWeek(second)}? You can send it now. If not, you&apos;ll get a reminder.
      </p>
      <WeekSection membershipId={membership.id} monday={second} settings={settings} now={now} asManager={false} />
    </>
  );
}
