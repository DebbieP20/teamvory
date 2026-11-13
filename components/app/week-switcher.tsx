import Link from "next/link";
import { formatWeek, type IsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

/** "This week / Next week" links (decision 22: only these two). */
export function WeekSwitcher({
  basePath,
  weeks,
  selected,
}: {
  basePath: string;
  weeks: { thisWeek: IsoDate; nextWeek: IsoDate };
  selected: "this" | "next";
}) {
  return (
    <nav aria-label="Week" className="grid max-w-xl grid-cols-2 overflow-hidden rounded-lg border">
      {(["this", "next"] as const).map((w) => (
        <Link
          key={w}
          href={`${basePath}?week=${w}`}
          aria-current={selected === w ? "page" : undefined}
          className={cn("px-3 py-2 text-center text-sm", selected === w ? "bg-navy font-semibold text-white" : "bg-white hover:bg-slate-50")}
        >
          {/* Phones: the dates go on their own line instead of breaking in the middle. */}
          {w === "this" ? "This week" : "Next week"}
          <span className="hidden sm:inline"> · </span>
          <span className="block whitespace-nowrap sm:inline">{formatWeek(w === "this" ? weeks.thisWeek : weeks.nextWeek)}</span>
        </Link>
      ))}
    </nav>
  );
}
