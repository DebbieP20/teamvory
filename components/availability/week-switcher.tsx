import Link from "next/link";
import { editableWeeks } from "@/lib/availability";
import { addDays, formatWeek, type IsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** The weeks a manager looks at: the one under way, the coming one (being scheduled) and the one after. */
export type ManagerWeek = "this" | "next" | "after";
const labels: Record<ManagerWeek, string> = { this: "This week", next: "Next week", after: "Week after" };

export function managerWeeks(today: IsoDate): Record<ManagerWeek, IsoDate> {
  const { thisWeek, nextWeek } = editableWeeks(today);
  return { this: thisWeek, next: nextWeek, after: addDays(nextWeek, 7) };
}

export const pickWeek = (value: unknown): ManagerWeek => (value === "this" || value === "after" ? value : "next");

export function WeekSwitcher({
  basePath,
  weeks,
  selected,
}: {
  basePath: string;
  weeks: Record<ManagerWeek, IsoDate>;
  selected: ManagerWeek;
}) {
  return (
    <nav aria-label="Week" className="grid max-w-xl grid-cols-3 overflow-hidden rounded-lg border">
      {(["this", "next", "after"] as const).map((w) => (
        <Link
          key={w}
          href={`${basePath}?week=${w}`}
          aria-current={selected === w ? "page" : undefined}
          className={cn(
            "px-2 py-2 text-center text-sm leading-tight",
            selected === w ? "bg-navy font-semibold text-white" : "bg-white hover:bg-slate-50",
          )}
        >
          {labels[w]}
          <span className="block text-xs opacity-80">{formatWeek(weeks[w])}</span>
        </Link>
      ))}
    </nav>
  );
}
