import { SubTabs } from "@/components/app/sub-tabs";
import { sendableWeeks } from "@/lib/availability";
import { getBusinessSettings, today } from "@/lib/availability-data";
import { formatWeek } from "@/lib/dates";
import { requireEmployee } from "@/lib/session";

export default async function MyAvailabilityLayout({ children }: LayoutProps<"/employee/availability">) {
  const { membership } = await requireEmployee();
  const { first, second } = sendableWeeks(today(await getBusinessSettings(membership.businessId)).date);
  const tabs = [
    { href: "/employee/availability", label: `This week · ${formatWeek(first)}` },
    { href: "/employee/availability/next", label: `Next week · ${formatWeek(second)}` },
    { href: "/employee/availability/time-off", label: "Time off" },
  ];
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl sm:text-3xl">My availability</h1>
      <SubTabs label="Availability" tabs={tabs} />
      {children}
    </div>
  );
}
