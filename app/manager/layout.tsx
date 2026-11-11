import { AppShell } from "@/components/app/app-shell";

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/employees", label: "Employees" },
  { href: "/manager/availability", label: "Availability" },
  { href: "/manager/shifts", label: "Shifts" },
  { href: "/manager/schedule", label: "Schedule" },
  { href: "/manager/settings", label: "Settings" },
];

export default function ManagerLayout({ children }: LayoutProps<"/manager">) {
  return (
    <AppShell home="/manager" links={links}>
      {children}
    </AppShell>
  );
}
