import { CalendarHeartIcon, MapPinIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EventActions, EventForm, EventShiftForm } from "@/components/events/event-forms";
import { addDays, formatDay, formatTime } from "@/lib/dates";
import { loadEvents, selectedWeek } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";

export const metadata: Metadata = { title: "Events" };

export default async function EventsPage() {
  const { membership } = await requireManager();
  const { now, weeks } = await selectedWeek(membership.businessId, undefined);
  const events = await loadEvents(membership.businessId, now.date);
  const lastEditable = addDays(weeks.nextWeek, 6);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">Events</h1>
        <p className="mt-1 text-muted-foreground">
          Private parties, markets, anything that changes the day. They show on the Shifts and Schedule pages, and you can add a
          shift to staff them.
        </p>
      </div>

      <section aria-labelledby="new-event-heading" className="rounded-xl border bg-white p-5 sm:p-6">
        <h2 id="new-event-heading" className="mb-4 text-lg">Add an event</h2>
        <EventForm minDate={now.date} />
      </section>

      <section aria-labelledby="upcoming-heading" className="space-y-3">
        <h2 id="upcoming-heading" className="text-lg">Coming up</h2>
        {events.length === 0 ? (
          <p className="rounded-xl border bg-white px-5 py-4 text-muted-foreground">No events coming up.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => {
              // Shifts exist for this week and next only (decision 22).
              const canStaff = e.date <= lastEditable;
              return (
                <li key={e.id} aria-label={e.title} className="space-y-3 rounded-xl border bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex gap-3">
                      <CalendarHeartIcon className="mt-0.5 size-6 shrink-0 text-teal-dark" aria-hidden />
                      <div>
                        <h3 className="text-base">{e.title}</h3>
                        <p className="text-sm">
                          {formatDay(e.date)}, {formatTime(e.startTime)} – {formatTime(e.endTime)}
                        </p>
                        {e.location && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPinIcon className="size-3.5" aria-hidden /> {e.location}
                          </p>
                        )}
                        {e.notes && <p className="mt-1 text-sm text-muted-foreground">{e.notes}</p>}
                      </div>
                    </div>
                    <EventActions
                      minDate={now.date}
                      event={{
                        id: e.id,
                        title: e.title,
                        date: e.date,
                        startTime: e.startTime,
                        endTime: e.endTime,
                        location: e.location ?? "",
                        notes: e.notes ?? "",
                        requiresStaffing: e.requiresStaffing,
                      }}
                    />
                  </div>

                  {e.requiresStaffing && (
                    <div className="border-t pt-3">
                      {e.shiftCount > 0 ? (
                        <p className="text-sm text-teal-dark">
                          ✓ {e.shiftCount === 1 ? "A shift is" : `${e.shiftCount} shifts are`} set up for it.{" "}
                          <Link href={`/manager/schedule?week=${e.date >= weeks.nextWeek ? "next" : "this"}`} className="font-semibold hover:underline">
                            Assign people
                          </Link>
                        </p>
                      ) : canStaff ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-amber-800">Needs extra staff: no shift added yet.</p>
                          <EventShiftForm eventId={e.id} title={e.title} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Needs extra staff. You can add its shift once it&apos;s this week or next.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
