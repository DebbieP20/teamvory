import type { Metadata } from "next";
import Link from "next/link";
import { Downloads } from "@/components/reports/downloads";
import { addDays, formatWeek, fromDbDate, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { exportData, fmtHours } from "@/lib/exports/data";
import { selectedWeek } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };


/** Hours per person and schedule downloads, for this week, next week and the last few months. */
export default async function ReportsPage({ searchParams }: PageProps<"/manager/reports">) {
  const { membership } = await requireManager();
  const { weeks } = await selectedWeek(membership.businessId, undefined);
  const withShifts = await db.week.findMany({
    where: {
      businessId: membership.businessId,
      startDate: { gte: toDbDate(addDays(weeks.thisWeek, -7 * 12)), lte: toDbDate(weeks.nextWeek) },
      shifts: { some: {} },
    },
    orderBy: { startDate: "desc" },
    select: { startDate: true },
  });
  const mondays = withShifts.map((w) => fromDbDate(w.startDate));
  const asked = String((await searchParams).week ?? "");
  const monday = mondays.includes(asked) ? asked : mondays.includes(weeks.thisWeek) ? weeks.thisWeek : mondays[0];
  const data = monday ? await exportData(membership.businessId, monday) : null;
  const hours = data?.hours ?? [];
  const totalHours = hours.reduce((n, h) => n + h.hours, 0);

  const weekName = (m: string) => (m === weeks.thisWeek ? "This week" : m === weeks.nextWeek ? "Next week" : formatWeek(m));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl">Reports</h1>
        <p className="mt-1 text-muted-foreground">Hours per person, and the schedule to print or share.</p>
      </div>

      {!data ? (
        <p className="rounded-xl border bg-white p-6 text-muted-foreground">
          No schedules yet. Set up a week on the{" "}
          <Link href="/manager/shifts" className="font-semibold text-teal-dark hover:underline">
            Shifts
          </Link>{" "}
          page first.
        </p>
      ) : (
        <>
          <nav aria-label="Week" className="flex flex-wrap gap-2">
            {mondays.map((m) => (
              <Link
                key={m}
                href={`/manager/reports?week=${m}`}
                aria-current={m === monday ? "page" : undefined}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium",
                  m === monday ? "border-navy bg-navy text-white" : "bg-white hover:border-teal",
                )}
              >
                {weekName(m)}
                {m === weeks.thisWeek || m === weeks.nextWeek ? <span className="font-normal opacity-75"> · {formatWeek(m)}</span> : null}
              </Link>
            ))}
          </nav>

          <p className="text-muted-foreground">
            <strong className="text-navy">{data.week}</strong> · {data.status}
          </p>

          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <section aria-labelledby="hours-heading" className="rounded-xl border bg-white">
              <h2 id="hours-heading" className="border-b px-5 py-3 text-lg">Hours this week</h2>
              {hours.length === 0 ? (
                <p className="px-5 py-4 text-muted-foreground">Nobody is on the schedule yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-medium">Name</th>
                      <th scope="col" className="px-5 py-2 text-right font-medium">Shifts</th>
                      <th scope="col" className="px-5 py-2 text-right font-medium">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hours.map((h) => (
                      <tr key={h.name} className="border-t">
                        <td className="px-5 py-2">{h.name}</td>
                        <td className="px-5 py-2 text-right">{h.shifts}</td>
                        <td className="px-5 py-2 text-right font-semibold">{fmtHours(h.hours)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-slate-50 font-semibold">
                      <td className="px-5 py-2">Total</td>
                      <td className="px-5 py-2 text-right">{hours.reduce((n, h) => n + h.shifts, 0)}</td>
                      <td className="px-5 py-2 text-right">{fmtHours(totalHours)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </section>

            <section aria-labelledby="downloads-heading" className="space-y-2">
              <h2 id="downloads-heading" className="text-lg">Download the schedule</h2>
              <Downloads monday={data.monday} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
