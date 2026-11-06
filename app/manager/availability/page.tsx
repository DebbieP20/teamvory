import type { Metadata } from "next";
import Link from "next/link";
import { deadlineText } from "@/components/availability/deadline-text";
import { ReviewButtons } from "@/components/availability/review-buttons";
import { type DaySetting, editableWeeks, resolveDay } from "@/lib/availability";
import { getBusinessSettings, loadWeek, today } from "@/lib/availability-data";
import { formatDay, formatTime, formatWeek, fromDbDate, toDbDate, WEEKDAYS_SHORT, weekDates, addDays } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireManager } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Availability" };

/** Compact cell text: "All day", "2–9 PM", "12–5:30 PM", "Off". */
function short(d: DaySetting) {
  if (d.kind === "ALL_DAY") return "All day";
  if (d.kind === "CUSTOM" && d.startTime && d.endTime) {
    const [s, e] = [formatTime(d.startTime), formatTime(d.endTime)];
    return s.slice(-2) === e.slice(-2) ? `${s.slice(0, -3)}–${e}` : `${s}–${e}`;
  }
  return "Off";
}

export default async function AvailabilityOverview({ searchParams }: PageProps<"/manager/availability">) {
  const { membership } = await requireManager();
  const selected = (await searchParams).week === "next" ? "next" : "this";
  const settings = await getBusinessSettings(membership.businessId);
  const now = today(settings);
  const weeks = editableWeeks(now.date);
  const monday = selected === "next" ? weeks.nextWeek : weeks.thisWeek;
  const dates = weekDates(monday);

  const people = await db.membership.findMany({
    where: { businessId: membership.businessId, status: "ACTIVE", schedulingMode: { not: "NOT_SCHEDULED" } },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const week = await loadWeek(people.map((p) => p.id), monday);
  const notSet = people.filter((p) => week.get(p.id)!.template.size === 0);

  const [pending, upcoming] = await Promise.all([
    db.timeOff.findMany({
      where: { status: "PENDING", membership: { businessId: membership.businessId } },
      include: { membership: { include: { user: { select: { name: true } } } } },
      orderBy: { startDate: "asc" },
    }),
    db.timeOff.findMany({
      where: {
        status: "APPROVED",
        membership: { businessId: membership.businessId, status: "ACTIVE" },
        endDate: { gte: toDbDate(now.date) },
        startDate: { lte: toDbDate(addDays(now.date, 60)) },
      },
      include: { membership: { include: { user: { select: { name: true } } } } },
      orderBy: { startDate: "asc" },
    }),
  ]);
  const range = (s: Date, e: Date) =>
    fromDbDate(s) === fromDbDate(e) ? formatDay(fromDbDate(s)) : `${formatDay(fromDbDate(s))} – ${formatDay(fromDbDate(e))}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Availability</h1>
        <p className="mt-1 text-muted-foreground">When your team can work. Click a name to change it for them.</p>
      </div>

      <nav aria-label="Week" className="grid max-w-xl grid-cols-2 overflow-hidden rounded-lg border">
        {(["this", "next"] as const).map((w) => (
          <Link
            key={w}
            href={`/manager/availability?week=${w}`}
            aria-current={selected === w ? "page" : undefined}
            className={cn("px-3 py-2 text-center text-sm", selected === w ? "bg-navy font-semibold text-white" : "bg-white hover:bg-slate-50")}
          >
            {w === "this" ? "This week" : "Next week"} · {formatWeek(w === "this" ? weeks.thisWeek : weeks.nextWeek)}
          </Link>
        ))}
      </nav>
      {deadlineText(monday, settings.deadline) && <p className="-mt-4 text-sm text-muted-foreground">{deadlineText(monday, settings.deadline)}</p>}

      {notSet.length > 0 && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {notSet.length === 1 ? "1 person hasn't" : `${notSet.length} people haven't`} set their default week yet:{" "}
          {notSet.map((p) => p.user.name).join(", ")}.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption className="sr-only">Team availability for {formatWeek(monday)}</caption>
          <thead>
            <tr className="border-b bg-slate-50 text-left">
              <th scope="col" className="px-3 py-2 font-semibold">Person</th>
              {dates.map((d, i) => (
                <th key={d} scope="col" className="px-2 py-2 font-semibold">
                  {WEEKDAYS_SHORT[i]} <span className="font-normal text-muted-foreground">{d.slice(8).replace(/^0/, "")}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const data = week.get(p.id)!;
              return (
                <tr key={p.id} className="border-b last:border-b-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    <Link href={`/manager/availability/${p.id}?week=${selected}`} className="text-teal-dark hover:underline">
                      {p.user.name}
                    </Link>
                    {p.role === "OWNER" && <span className="ml-1 text-xs text-muted-foreground">(owner)</span>}
                  </th>
                  {dates.map((d) => {
                    const r = resolveDay(d, data.template, data.overrides, data.timeOff);
                    const text =
                      r.source === "time-off" ? "Time off" : r.source === "pending-time-off" ? "Pending" : r.source === "not-set" ? "–" : short(r);
                    return (
                      <td
                        key={d}
                        className={cn(
                          "px-2 py-2 whitespace-nowrap",
                          r.kind === "OFF" && "text-muted-foreground",
                          r.source === "time-off" && "bg-violet-50 text-violet-800",
                          r.source === "pending-time-off" && "bg-amber-50 text-amber-900",
                          r.source === "change" && "font-semibold text-teal-dark",
                        )}
                      >
                        {text}
                        {r.source === "change" && <span className="sr-only"> (changed this week)</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="-mt-6 text-xs text-muted-foreground">
        <span className="font-semibold text-teal-dark">Bold teal</span> = changed for this week only ·{" "}
        <span className="text-violet-800">Time off</span> · <span className="text-amber-900">Pending</span> = time off waiting for approval ·
        “–” = not set
      </p>

      {pending.length > 0 && (
        <section aria-labelledby="requests-heading" className="space-y-3">
          <h2 id="requests-heading" className="text-lg">Time-off requests</h2>
          <ul className="divide-y rounded-xl border bg-white">
            {pending.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{t.membership.user.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {range(t.startDate, t.endDate)}
                    {t.note && ` · ${t.note}`}
                  </div>
                </div>
                <ReviewButtons timeOffId={t.id} label={`${t.membership.user.name}, ${range(t.startDate, t.endDate)}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <h2 id="upcoming-heading" className="text-lg">Upcoming time off</h2>
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No time off in the next 60 days.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-white">
            {upcoming.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <span className="font-medium">{t.membership.user.name}</span>
                <span className="text-muted-foreground"> · {range(t.startDate, t.endDate)}{t.note && ` · ${t.note}`}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
