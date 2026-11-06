import { AppShell } from "@/components/app/app-shell";

const links = [
  { href: "/manager", label: "Dashboard" },
  { href: "/manager/employees", label: "Employees" },
];

export default function ManagerLayout({ children }: LayoutProps<"/manager">) {
  return (
    <AppShell home="/manager" links={links}>
      {children}
    </AppShell>
  );
}
