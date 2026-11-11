"use client";

import { PlusIcon } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FormMessage, SubmitButton, submitWithoutReset } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/dates";
import { idleState } from "@/lib/form-state";
import { addShift, applyPattern, copyLastWeek, deleteShift, updateShift } from "@/lib/schedule-actions";
import { ShiftFields } from "./shift-fields";

const selectClass =
  "h-10 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CopyLastWeekForm({ monday, hasShifts }: { monday: string; hasShifts: boolean }) {
  const [state, action, pending] = useActionState(copyLastWeek, idleState);
  return (
    <form
      onSubmit={(e) => {
        if (hasShifts && !confirm("Replace this week's shifts with last week's? Anyone assigned to them will be removed.")) {
          e.preventDefault();
          return;
        }
        submitWithoutReset(action)(e);
      }}
      className="space-y-2"
    >
      <input type="hidden" name="monday" value={monday} />
      <SubmitButton pendingText="Copying…" pending={pending} variant="outline">
        Copy last week
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}

export function ApplyPatternForm({
  monday,
  days,
  patterns,
}: {
  monday: string;
  days: { date: string; label: string; hasShifts: boolean }[];
  patterns: { id: string; name: string; summary: string }[];
}) {
  const [state, action, pending] = useActionState(applyPattern, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  // Untick the days after applying, so the next pattern isn't applied to them by mistake.
  useEffect(() => {
    if (state.status === "success") formRef.current?.querySelectorAll<HTMLInputElement>('input[name="date"]').forEach((c) => (c.checked = false));
  }, [state]);
  if (!patterns.length) return null;

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        const ticked = new FormData(e.currentTarget).getAll("date").map(String);
        const replacing = days.filter((d) => ticked.includes(d.date) && d.hasShifts);
        if (replacing.length && !confirm(`Replace the shifts on ${replacing.map((d) => d.label).join(", ")}? Anyone assigned to them will be removed.`)) {
          e.preventDefault();
          return;
        }
        submitWithoutReset(action)(e);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="monday" value={monday} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm font-medium">
          <span className="block">Pattern</span>
          <select name="patternId" className={selectClass}>
            {patterns.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.summary})
              </option>
            ))}
          </select>
        </label>
        <SubmitButton pendingText="Applying…" pending={pending} variant="outline">
          Apply to ticked days
        </SubmitButton>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Days</legend>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <label key={d.date} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm has-checked:border-teal has-checked:bg-mint">
              <input type="checkbox" name="date" value={d.date} className="size-4 accent-teal-600" />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
    </form>
  );
}

export function ShiftRowForm({
  shift,
  assigned,
}: {
  shift: { id: string; startTime: string; endTime: string; requiredCount: number };
  assigned: number;
}) {
  const [state, action, pending] = useActionState(updateShift, idleState);
  const [editing, setEditing] = useState(false);
  // Back to the short view once saved (adjusting state during render).
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") setEditing(false);
  }
  const summary = `${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`;

  if (!editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium">{summary}</div>
          <div className="text-xs text-muted-foreground">
            {shift.requiredCount} {shift.requiredCount === 1 ? "person" : "people"}
            {assigned > 0 && ` · ${assigned} assigned`}
          </div>
        </div>
        <Button variant="outline" size="lg" onClick={() => setEditing(true)} aria-label={`Edit: ${summary}`}>
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-teal bg-white p-3">
      <form onSubmit={submitWithoutReset(action)} noValidate className="space-y-2">
        <input type="hidden" name="shiftId" value={shift.id} />
        <ShiftFields label={summary} initial={{ start: shift.startTime, end: shift.endTime, required: shift.requiredCount }} />
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton pendingText="Saving…" pending={pending} className="h-9 px-3">
            Save
          </SubmitButton>
          <Button type="button" variant="ghost" className="h-9" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
      <FormMessage state={state} />
      <form
        action={deleteShift}
        onSubmit={(e) => {
          const msg = assigned
            ? `Remove this shift? The ${assigned} ${assigned === 1 ? "person" : "people"} assigned to it will be removed from the schedule.`
            : "Remove this shift?";
          if (!confirm(msg)) e.preventDefault();
        }}
      >
        <input type="hidden" name="shiftId" value={shift.id} />
        <RemoveButton />
      </form>
    </div>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-sm font-semibold text-destructive hover:underline disabled:opacity-50">
      Remove shift
    </button>
  );
}

export function AddShiftForm({ date, label }: { date: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(addShift, idleState);
  // Close the form once the shift is added (adjusting state during render).
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.status === "success") setOpen(false);
  }
  if (!open) {
    return (
      <Button variant="outline" size="lg" className="w-full border-dashed" onClick={() => setOpen(true)} aria-label={`Add shift: ${label}`}>
        <PlusIcon data-icon="inline-start" /> Add shift
      </Button>
    );
  }
  return (
    <form
      onSubmit={submitWithoutReset(action)}
      noValidate
      className="space-y-2 rounded-lg border border-dashed border-teal bg-mint/40 p-3"
    >
      <input type="hidden" name="date" value={date} />
      <ShiftFields label={`New shift on ${label}`} initial={{ start: "12:00", end: "17:00", required: 1 }} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Adding…" pending={pending} className="h-9 px-3">
          Add
        </SubmitButton>
        <Button type="button" variant="ghost" className="h-9" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
