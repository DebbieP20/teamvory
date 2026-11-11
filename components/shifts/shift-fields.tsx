"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useId, useState } from "react";
import { TimeCombobox, timeProblem } from "@/components/forms/time-combobox";
import { MAX_PEOPLE } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/**
 * Start, end and people needed for one shift. Field names: "start", "end",
 * "required" (repeatable, so a pattern form can hold several shifts).
 */
export function ShiftFields({
  initial,
  label,
}: {
  initial: { start: string; end: string; required: number };
  /** e.g. "Shift 1", used to name the group for screen readers */
  label: string;
}) {
  const id = useId();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const startProblem = timeProblem(start);
  const endProblem = timeProblem(end);
  const orderProblem = !startProblem && !endProblem && start >= end;
  const message = startProblem ?? endProblem ?? (orderProblem ? "The end time must be after the start time." : null);

  return (
    <fieldset className="space-y-1">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <TimeCombobox
          id={`${id}-start`}
          name="start"
          value={start}
          onChange={setStart}
          invalid={!!startProblem || orderProblem}
          errorId={`${id}-error`}
          label="Start"
        />
        <span aria-hidden>–</span>
        <TimeCombobox
          id={`${id}-end`}
          name="end"
          value={end}
          onChange={setEnd}
          invalid={!!endProblem || orderProblem}
          errorId={`${id}-error`}
          label="End"
        />
        {/* Label and list stay together on one line, so the number clearly means people. */}
        <span className="flex items-center gap-2 whitespace-nowrap">
          <select
            id={`${id}-required`}
            name="required"
            defaultValue={Math.min(initial.required, MAX_PEOPLE)}
            className="h-10 rounded-lg border border-input bg-white px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Array.from({ length: MAX_PEOPLE }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <label htmlFor={`${id}-required`}>people</label>
        </span>
      </div>
      <p id={`${id}-error`} aria-live="polite" className={cn("text-sm font-medium text-destructive", message && "mt-1")}>
        {message && (
          <>
            <TriangleAlertIcon className="mr-1 inline size-4 -translate-y-px" aria-hidden />
            {message}
          </>
        )}
      </p>
    </fieldset>
  );
}
