import { SubTabs } from "@/components/app/sub-tabs";

const tabs = [
  { href: "/employee/availability", label: "Default week" },
  { href: "/employee/availability/week", label: "This & next week" },
  { href: "/employee/availability/time-off", label: "Time off" },
];

export default function MyAvailabilityLayout({ children }: LayoutProps<"/employee/availability">) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl sm:text-3xl">My availability</h1>
      <SubTabs label="Availability" tabs={tabs} />
      {children}
    </div>
  );
}
