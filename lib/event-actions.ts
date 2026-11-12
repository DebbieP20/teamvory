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
    const updated = await db.event.updateMany({ where: { id: eventId, businessId: membership.businessId }, data });
    if (!updated.count) return errorState("That event no longer exists.");
  } else {
    await db.event.create({ data: { ...data, businessId: membership.businessId } });
  }
  refresh();
  return { status: "success", message: `${values.title} saved.` };
}

export async function deleteEvent(formData: FormData) {
  const { membership } = await requireManager();
  const eventId = String(formData.get("eventId"));
  if (!z.uuid().safeParse(eventId).success) return;
  // Its staffing shifts stay (they may have people on them); they just lose the label.
  await db.event.deleteMany({ where: { id: eventId, businessId: membership.businessId } });
  refresh();
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
