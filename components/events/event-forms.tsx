"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { FormMessage, SubmitButton, submitWithoutReset, TextField } from "@/components/forms/fields";
import { TimeCombobox, timeProblem } from "@/components/forms/time-combobox";
import { Button } from "@/components/ui/button";
import { addEventShift, deleteEvent, saveEvent } from "@/lib/event-actions";
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
  const [start, setStart] = useState(initial?.startTime ?? "18:00");
  const [end, setEnd] = useState(initial?.endTime ?? "22:00");
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
        setStart("18:00");
        setEnd("22:00");
        setStaffing(true);
      }
    }
  }

  const fieldError = state.status === "error" ? state.fieldErrors?.time : undefined;
  const localProblem = timeProblem(start) ?? timeProblem(end) ?? (start && end && start >= end ? "The end time must be after the start time." : null);
  const timeError = localProblem ?? fieldError;

  return (
    <div className="space-y-3">
      {!onDone && <FormMessage state={state} />}
      <form key={formKey} onSubmit={submitWithoutReset(action)} noValidate className="space-y-4">
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

/** Edit / Delete for one event in the list. */
export function EventActions({ event, minDate }: { event: EventFormValues & { id: string }; minDate: string }) {
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
          if (!confirm(`Delete "${event.title}"? Any shifts you added for it stay on the schedule.`)) e.preventDefault();
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
