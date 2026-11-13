"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { weekStart, toDbDate, fromDbDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { errorState, type FormState } from "@/lib/form-state";
import { validateEvent } from "@/lib/events";
import { getOrCreateWeek, selectedWeek } from "@/lib/schedule-data";
import { requireManager } from "@/lib/session";

// Events (decision 16). Only managers manage them; staffing shifts are added by hand.

const read = (formData: FormData) => ({
  title: String(formData.get("title") ?? "").trim(),
  date: String(formData.get("date") ?? ""),
  start: String(formData.get("start") ?? ""),
  end: String(formData.get("end") ?? ""),
  location: String(formData.get("location") ?? "").trim(),
  notes: String(formData.get("notes") ?? "").trim(),
});

export async function saveEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireManager();
  const values = read(formData);
  const errors = validateEvent(values);
  if (errors) return errorState(undefined, errors, values);

  const eventId = String(formData.get("eventId") ?? "");
  const data = {
    title: values.title,
    date: toDbDate(values.date),
    startTime: values.start,
    endTime: values.end,
    location: values.location || null,
    notes: values.notes || null,
    requiresStaffing: formData.get("requiresStaffing") === "on",
  };
  if (eventId) {
    if (!z.uuid().safeParse(eventId).success) return errorState("That event no longer exists.");
    const event = await db.event.findFirst({ where: { id: eventId, businessId: membership.businessId }, include: { shifts: true } });
    if (!event) return errorState("That event no longer exists.");

    // Its staffing shifts follow the event's new date and times.
    let week = null;
    if (event.shifts.length && values.date !== fromDbDate(event.date)) {
      const { weeks } = await selectedWeek(membership.businessId, undefined);
      const monday = weekStart(values.date);
      if (monday !== weeks.thisWeek && monday !== weeks.nextWeek) {
        return errorState(
          "This event has a shift, and shifts can only be this week or next. Pick a date in those weeks, or delete the event and add it again later.",
          { date: "Pick a date this week or next week." },
          values,
        );
      }
      week = await getOrCreateWeek(membership.businessId, monday);
    }
    await db.$transaction([
      db.event.update({ where: { id: event.id }, data }),
      db.shift.updateMany({
        where: { eventId: event.id },
        data: { startTime: values.start, endTime: values.end, date: toDbDate(values.date), ...(week ? { weekId: week.id } : {}) },
      }),
    ]);
  } else {
    await db.event.create({ data: { ...data, businessId: membership.businessId } });
  }
  refresh();
  return { status: "success", message: `${values.title} saved.` };
}

/** Deletes the event and its staffing shifts (the people on them come off the draft schedule). */
export async function deleteEvent(formData: FormData) {
  const { membership } = await requireManager();
  const eventId = String(formData.get("eventId"));
  if (!z.uuid().safeParse(eventId).success) return;
  const event = await db.event.findFirst({ where: { id: eventId, businessId: membership.businessId } });
  if (!event) return;
  await db.$transaction([db.shift.deleteMany({ where: { eventId: event.id } }), db.event.delete({ where: { id: event.id } })]);
  refresh();
}

/** Changes how many people an event's shift needs. */
export async function setEventShiftPeople(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireManager();
  const shiftId = String(formData.get("shiftId"));
  const required = Number(formData.get("required"));
  if (!z.uuid().safeParse(shiftId).success) return errorState("That shift no longer exists.");
  if (!Number.isInteger(required) || required < 1 || required > 5) return errorState("Choose how many people (1–5).");
  const shift = await db.shift.findFirst({
    where: { id: shiftId, event: { businessId: membership.businessId } },
    include: { week: true, assignments: { where: { schedule: { status: "DRAFT" } } } },
  });
  if (!shift) return errorState("That shift no longer exists.");
  const { weeks } = await selectedWeek(membership.businessId, undefined);
  const monday = fromDbDate(shift.week.startDate);
  if (monday !== weeks.thisWeek && monday !== weeks.nextWeek) return errorState("You can only change this week and next week.");

  await db.shift.update({ where: { id: shift.id }, data: { requiredCount: required } });
  refresh();
  const extra = shift.assignments.length - required;
  return {
    status: "success",
    message:
      extra > 0
        ? `Saved: ${required} ${required === 1 ? "person" : "people"}. ${shift.assignments.length} are assigned, so remove ${extra} on the Schedule.`
        : `Saved: ${required} ${required === 1 ? "person" : "people"}.`,
  };
}

/** Adds a shift at the event's times, linked to it, for the people it needs. */
export async function addEventShift(_prev: FormState, formData: FormData): Promise<FormState> {
  const { membership } = await requireManager();
  const eventId = String(formData.get("eventId"));
  const required = Number(formData.get("required"));
  if (!z.uuid().safeParse(eventId).success) return errorState("That event no longer exists.");
  if (!Number.isInteger(required) || required < 1 || required > 5) return errorState("Choose how many people (1–5).");

  const event = await db.event.findFirst({ where: { id: eventId, businessId: membership.businessId } });
  if (!event) return errorState("That event no longer exists.");
  const date = fromDbDate(event.date);
  const { weeks } = await selectedWeek(membership.businessId, undefined);
  const monday = weekStart(date);
  if (monday !== weeks.thisWeek && monday !== weeks.nextWeek) {
    return errorState("Shifts can be set up for this week and next week. Add it when the event's week comes up.");
  }

  const week = await getOrCreateWeek(membership.businessId, monday);
  await db.shift.create({
    data: { weekId: week.id, date: event.date, startTime: event.startTime, endTime: event.endTime, requiredCount: required, eventId: event.id },
  });
  refresh();
  return { status: "success", message: `Shift added for ${event.title}. Assign people on the Schedule.` };
}
