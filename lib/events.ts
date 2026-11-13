import { validateShift } from "@/lib/schedule";

// Events (decision 16): a private party, a market booth... shown in planning.
// The manager adds the staffing shifts by hand from the event.

export type EventInput = { title: string; date: string; start: string; end: string; location: string; notes: string };

/** Field errors for an event, or null. */
export function validateEvent(e: EventInput): Record<string, string> | null {
  const errors: Record<string, string> = {};
  if (!e.title.trim() || e.title.trim().length > 80) errors.title = "Give the event a name (up to 80 characters).";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) errors.date = "Choose the date.";
  const times = validateShift({ start: e.start, end: e.end, required: 1 });
  if (times) errors.time = times;
  if (e.location.length > 120) errors.location = "Please keep the location under 120 characters.";
  if (e.notes.length > 500) errors.notes = "Please keep the notes under 500 characters.";
  return Object.keys(errors).length ? errors : null;
}
