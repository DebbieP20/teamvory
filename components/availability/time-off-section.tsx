import { removeTimeOff } from "@/lib/availability-actions";
import { formatDay, fromDbDate, toDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { AddTimeOffForm, RemoveButton } from "./time-off-forms";

const statusPill = {
  APPROVED: null,
  PENDING: { text: "Waiting for approval", className: "bg-amber-100 text-amber-900" },
  DECLINED: { text: "Declined", className: "bg-red-50 text-destructive" },
} as const;

/** Upcoming time off for one person, plus the form to add more. */
export async function TimeOffSection({
  membershipId,
  todayDate,
  approvalRequired,
  canRemove,
}: {
  membershipId: string;
  todayDate: string;
  approvalRequired: boolean;
  canRemove: boolean;
}) {
  const entries = await db.timeOff.findMany({
    where: { membershipId, endDate: { gte: toDbDate(todayDate) } },
    orderBy: { startDate: "asc" },
  });

  return (
    <div className="space-y-6">
      {entries.length === 0 ? (
        <p className="text-muted-foreground">No upcoming time off.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-white">
          {entries.map((t) => {
            const start = fromDbDate(t.startDate);
            const end = fromDbDate(t.endDate);
            const pill = statusPill[t.status];
            const label = start === end ? formatDay(start) : `${formatDay(start)} – ${formatDay(end)}`;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{label}</div>
                  {t.note && <div className="text-sm text-muted-foreground">{t.note}</div>}
                </div>
                {pill && <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", pill.className)}>{pill.text}</span>}
                {canRemove && start >= todayDate && (
                  <form action={removeTimeOff}>
                    <input type="hidden" name="timeOffId" value={t.id} />
                    <RemoveButton label={label} />
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <section className="rounded-xl border bg-white p-4 sm:p-6" aria-labelledby={`add-time-off-${membershipId}`}>
        <h3 id={`add-time-off-${membershipId}`} className="text-base">
          Add time off
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {approvalRequired
            ? "Days you can't work at all. Your manager approves or declines the request."
            : "Days you can't work at all. No approval needed: your manager sees it right away."}
        </p>
        <AddTimeOffForm membershipId={membershipId} minDate={todayDate} />
      </section>
    </div>
  );
}
