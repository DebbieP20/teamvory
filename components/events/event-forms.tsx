"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { FormMessage, SubmitButton, submitWithoutReset, TextField } from "@/components/forms/fields";
import { TimeCombobox, timeProblem } from "@/components/forms/time-combobox";
import { Button } from "@/components/ui/button";
import { addEventShift, deleteEvent, saveEvent, setEventShiftPeople } from "@/lib/event-actions";
import { idleState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export type EventFormValues = {
  id?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  requiresStaffing: boolean;
};

/** Add or edit an event. */
export function EventForm({ initial, onDone, minDate }: { initial?: EventFormValues; onDone?: () => void; minDate: string }) {
  const [state, action, pending] = useActionState(saveEvent, idleState);
  const id = useId();
  // New events start empty, so they can't be saved with times nobody chose.
  const [start, setStart] = useState(initial?.startTime ?? "");
  const [end, setEnd] = useState(initial?.endTime ?? "");
  const [staffing, setStaffing] = useState(initial?.requiresStaffing ?? true);
  // Close (editing) or clear (adding) once saved: adjusting state during render.
  const [last, setLast] = useState(state);
  const [formKey, setFormKey] = useState(0);
  if (state !== last) {
    setLast(state);
    if (state.status === "success") {
      if (onDone) onDone();
      else {
        setFormKey((k) => k + 1);
        setStart("");
        setEnd("");
        setStaffing(true);
      }
    }
  }

  // The server's time error only applies to the times it was sent; changing either clears it.
  const fieldError =
    state.status === "error" && state.values?.start === start && state.values?.end === end ? state.fieldErrors?.time : undefined;
  // Empty times are only an error once someone tries to save (the server says so).
  const localProblem =
    (start && timeProblem(start)) || (end && timeProblem(end)) || (start && end && start >= end ? "The end time must be after the start time." : null) || null;
  const timeError = localProblem ?? fieldError;

  return (
    <div className="space-y-3">
      {!onDone && <FormMessage state={state} />}
      <form key={formKey} onSubmit={submitWithoutReset(action)} onKeyDown={enterMovesOn} noValidate className="space-y-4">
        {initial?.id && <input type="hidden" name="eventId" value={initial.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="title" label="Event" placeholder="e.g. Private party" defaultValue={initial?.title} maxLength={80} required state={state} />
          <TextField name="date" label="Date" type="date" min={minDate} defaultValue={initial?.date} required state={state} />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <TimeCombobox id={`${id}-start`} name="start" value={start} onChange={setStart} invalid={!!timeError} errorId={`${id}-time`} label="Start" />
            <span aria-hidden>–</span>
            <TimeCombobox id={`${id}-end`} name="end" value={end} onChange={setEnd} invalid={!!timeError} errorId={`${id}-time`} label="End" />
          </div>
          <p id={`${id}-time`} aria-live="polite" className={cn("text-sm font-medium text-destructive", timeError && "mt-1")}>
            {timeError && (
              <>
                <TriangleAlertIcon className="mr-1 inline size-4 -translate-y-px" aria-hidden />
                {timeError}
              </>
            )}
          </p>
        </div>
        <TextField name="location" label="Location (optional)" defaultValue={initial?.location} maxLength={120} state={state} />
        <div className="space-y-2">
          <label htmlFor={`${id}-notes`} className="block text-sm font-medium">
            Notes <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id={`${id}-notes`}
            name="notes"
            defaultValue={initial?.notes}
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-input bg-white px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <label className="flex items-center gap-3 font-medium">
          <input
            type="checkbox"
            name="requiresStaffing"
            checked={staffing}
            onChange={(e) => setStaffing(e.target.checked)}
            className="size-5 accent-teal-600"
          />
          Needs extra staff
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pending={pending} pendingText="Saving…">
            {initial?.id ? "Save event" : "Add event"}
          </SubmitButton>
          {onDone && (
            <Button type="button" variant="ghost" className="h-11" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      {onDone && <FormMessage state={state} />}
    </div>
  );
}

/**
 * Enter in a text box moves to the next field instead of saving the form, so nobody
 * saves an event before filling in the times. Enter on the Save button still saves.
 */
function enterMovesOn(e: React.KeyboardEvent<HTMLFormElement>) {
  const target = e.target as HTMLElement;
  if (e.key !== "Enter" || !(target instanceof HTMLInputElement) || target.type === "checkbox") return;
  e.preventDefault();
  const fields = [...e.currentTarget.querySelectorAll<HTMLElement>("input:not([type=hidden]), textarea, button[type=submit]")].filter(
    (el) => el.tabIndex !== -1,
  );
  fields[fields.indexOf(target) + 1]?.focus();
}

/** Edit / Delete for one event in the list. */
export function EventActions({
  event,
  minDate,
  assigned,
}: {
  event: EventFormValues & { id: string };
  minDate: string;
  /** People on its staffing shifts (they come off the schedule if it's deleted) */
  assigned: number;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className="rounded-lg border border-teal bg-white p-4">
        <EventForm initial={event} onDone={() => setEditing(false)} minDate={minDate} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-4">
      <Button variant="outline" size="lg" onClick={() => setEditing(true)} aria-label={`Edit: ${event.title}`}>
        Edit
      </Button>
      <form
        action={deleteEvent}
        onSubmit={(e) => {
          const message = assigned
            ? `Delete "${event.title}"? Its shift is removed too, and the ${assigned} ${assigned === 1 ? "person" : "people"} on it come off the schedule. If it's already published, publish again so they're told.`
            : `Delete "${event.title}"? Its shift, if any, is removed too.`;
          if (!confirm(message)) e.preventDefault();
        }}
      >
        <input type="hidden" name="eventId" value={event.id} />
        <button type="submit" className="text-sm font-semibold text-destructive hover:underline" aria-label={`Delete: ${event.title}`}>
          Delete
        </button>
      </form>
    </div>
  );
}

/** "Add a shift for this event" with how many people. */
export function EventShiftForm({ eventId, title }: { eventId: string; title: string }) {
  const [state, action, pending] = useActionState(addEventShift, idleState);
  const id = useId();
  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="eventId" value={eventId} />
        <span className="flex items-center gap-2 whitespace-nowrap text-sm">
          <select
            id={`${id}-required`}
            name="required"
            defaultValue={2}
            className="h-10 rounded-lg border border-input bg-white px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <label htmlFor={`${id}-required`}>people</label>
        </span>
        <SubmitButton pending={pending} pendingText="Adding…" className="h-10 px-4" aria-label={`Add a shift for ${title}`}>
          Add a shift for it
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}

/** How many people an event's shift needs, changeable after it's added. */
export function EventShiftPeople({ shiftId, required, label }: { shiftId: string; required: number; label: string }) {
  const [state, action, pending] = useActionState(setEventShiftPeople, idleState);
  const [value, setValue] = useState(required);
  const id = useId();
  return (
    <div className="space-y-2">
      <form onSubmit={submitWithoutReset(action)} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="shiftId" value={shiftId} />
        <span className="flex items-center gap-2 whitespace-nowrap text-sm">
          <select
            id={`${id}-required`}
            name="required"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            aria-label={`People needed: ${label}`}
            className="h-10 rounded-lg border border-input bg-white px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span aria-hidden>people</span>
        </span>
        {value !== required && (
          <SubmitButton pending={pending} pendingText="Saving…" className="h-10 px-4">
            Save
          </SubmitButton>
        )}
      </form>
      <FormMessage state={state} />
    </div>
  );
}
