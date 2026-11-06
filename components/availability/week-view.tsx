import Link from "next/link";
import { describe, resolveDay } from "@/lib/availability";
import type { PersonWeek } from "@/lib/availability-data";
import { formatDay, formatWeek, type IsoDate, weekDates } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { WeekDayRow } from "./week-day-row";

/** "This week / Next week" switcher plus one row per day. */
export function WeekView({
  membershipId,
  basePath,
  weeks,
  selected,
  data,
  locked,
  deadlineText,
  todayDate,
}: {
  membershipId: string;
  basePath: string;
  weeks: { thisWeek: IsoDate; nextWeek: IsoDate };
  selected: "this" | "next";
  data: PersonWeek;
  locked: boolean;
  deadlineText: string | null;
  todayDate: IsoDate;
}) {
  const monday = selected === "next" ? weeks.nextWeek : weeks.thisWeek;
  return (
    <div className="space-y-4">
      <nav aria-label="Week" className="grid grid-cols-2 overflow-hidden rounded-lg border">
        {(["this", "next"] as const).map((w) => (
          <Link
            key={w}
            href={`${basePath}?week=${w}`}
            aria-current={selected === w ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-center text-sm",
              selected === w ? "bg-navy font-semibold text-white" : "bg-white hover:bg-slate-50",
            )}
          >
            {w === "this" ? "This week" : "Next week"} · {formatWeek(w === "this" ? weeks.thisWeek : weeks.nextWeek)}
          </Link>
        ))}
      </nav>

      {locked ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The availability deadline for this week has passed. Ask your manager if something changes.
        </p>
      ) : (
        deadlineText && <p className="text-sm text-muted-foreground">{deadlineText}</p>
      )}

      <ul className="space-y-2">
        {weekDates(monday).map((date) => {
          const resolved = resolveDay(date, data.template, data.overrides, data.timeOff);
          return (
            <WeekDayRow
              key={date}
              membershipId={membershipId}
              date={date}
              label={formatDay(date)}
              resolved={resolved}
              description={describe(resolved)}
              editable={!locked && date >= todayDate}
            />
          );
        })}
      </ul>
    </div>
  );
}
