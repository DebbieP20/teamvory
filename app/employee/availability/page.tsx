import type { Metadata } from "next";
import { DefaultWeekForm } from "@/components/availability/default-week-form";
import { type DaySetting } from "@/lib/availability";
import { loadTemplate } from "@/lib/availability-data";
import { requireEmployee } from "@/lib/session";

export const metadata: Metadata = { title: "My availability" };

export default async function DefaultWeekPage() {
  const { membership } = await requireEmployee();
  const template = await loadTemplate(membership.id);
  const days: DaySetting[] = Array.from({ length: 7 }, (_, i) => template.get(i + 1) ?? { kind: "OFF" });

  return (
    <>
      <p className="text-muted-foreground">
        {template.size === 0
          ? "When can you usually work? Set it once and it's used for every week, unless you change a specific week."
          : "When you can usually work. It's used for every week, unless you change a specific week."}
      </p>
      <DefaultWeekForm membershipId={membership.id} days={days} />
    </>
  );
}
