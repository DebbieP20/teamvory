import type { Metadata } from "next";
import { TimeOffSection } from "@/components/availability/time-off-section";
import { getBusinessSettings, today } from "@/lib/availability-data";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "Time off" };

export default async function TimeOffPage() {
  const { membership } = await requireEmployee();
  const settings = await getBusinessSettings(membership.businessId);
  return (
    <TimeOffSection
      membershipId={membership.id}
      todayDate={today(settings).date}
      approvalRequired={settings.timeOffApprovalRequired}
      canRemove
    />
  );
}
