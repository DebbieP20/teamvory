import { deadlineFor, describe, isWeekLocked, resolveDay } from "@/lib/availability";
import { type BusinessSettings, loadWeek } from "@/lib/availability-data";
import { formatDay, formatTime, formatWeek, type IsoDate, toDbDate, weekDates } from "@/lib/dates";
import { db } from "@/lib/db";
import { WeekForm, type WeekFormDay } from "./week-form";

/**
 * One person's availability for one week, ready to fill in and send.
 * `asManager`: a manager entering it for someone (or themselves); the deadline doesn't apply.
 */
export async function WeekSection({
  membershipId,
  monday,
  settings,
  now,
  asManager,
}: {
  membershipId: string;
  monday: IsoDate;
  settings: BusinessSettings;
  now: { date: IsoDate; time: string };
  asManager: boolean;
}) {
  const data = (await loadWeek([membershipId], monday)).get(membershipId)!;
  const sentRow = data.sent
    ? await db.availabilityWeek.findUnique({
        where: { membershipId_weekStart: { membershipId, weekStart: toDbDate(monday) } },
        select: { sentAt: true },
      })
    : null;
  const locked = !asManager && isWeekLocked(monday, settings.deadline, now);

  const days: WeekFormDay[] = weekDates(monday).map((date) => {
    const resolved = resolveDay(date, data.template, data.overrides, data.timeOff);
    const label = formatDay(date);
    const entered = resolved.source === "change" || resolved.source === "default" ? resolved : (data.overrides.get(date) ?? null);
    if (resolved.source === "time-off") return { date, label, initial: null, fixed: { text: "Time off", detail: "Not available" } };
    if (resolved.source === "pending-time-off") {
      return { date, label, initial: null, fixed: { text: "Time off requested", detail: "Waiting for approval" } };
    }
    if (date < now.date) return { date, label, initial: entered, fixed: { text: "Past", detail: entered ? describe(entered) : "Not sent" } };
    return { date, label, initial: entered };
  });

  const sentOn = sentRow
    ? new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: settings.timezone }).format(sentRow.sentAt)
    : null;
  const sentText = sentOn && (asManager ? `Sent ${sentOn}.` : `Sent ${sentOn}. You can still change it and send again.`);
  const deadline = settings.deadline.enabled ? deadlineFor(monday, settings.deadline) : null;

  return (
    <div className="space-y-4">
      {locked ? (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The availability deadline for {formatWeek(monday)} has passed. Ask your manager if something changes.
        </p>
      ) : (
        deadline &&
        !asManager && (
          <p className="text-sm text-muted-foreground">
            Due by {formatDay(deadline.date)} at {formatTime(deadline.time)}.
          </p>
        )
      )}
      <WeekForm
        key={monday}
        membershipId={membershipId}
        weekStart={monday}
        days={days}
        sent={locked ? null : sentText}
        locked={locked}
        submitLabel={asManager ? "Save availability" : sentRow ? "Send again" : "Send my availability"}
        pendingText={asManager ? "Saving…" : "Sending…"}
      />
    </div>
  );
}
