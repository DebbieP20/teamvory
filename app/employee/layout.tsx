import { AppShell } from "@/components/app/app-shell";

const links = [{ href: "/employee", label: "Home" }];

export default function EmployeeLayout({ children }: LayoutProps<"/employee">) {
  return (
    <AppShell home="/employee" links={links}>
      {children}
    </AppShell>
  );
}
