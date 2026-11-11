"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useId, useState } from "react";
import type { DaySetting, Kind } from "@/lib/availability";
import { TimeCombobox, timeProblem } from "@/components/forms/time-combobox";
import { cn } from "@/lib/utils";

const choices: { kind: Kind; label: string }[] = [
  { kind: "OFF", label: "Off" },
  { kind: "ALL_DAY", label: "All day" },
  { kind: "CUSTOM", label: "Custom" },
];

/**
 * One day's availability: Off / All day / Custom (one time range, decision 21).
 * Field names are `${prefix}kind`, `${prefix}start`, `${prefix}end`.
 */
export function DayEditor({
  legend,
  prefix = "",
  initial,
  error,
}: {
  legend: string;
  prefix?: string;
  initial: DaySetting;
  error?: string;
}) {
  const id = useId();
  const [kind, setKind] = useState<Kind>(initial.kind);
  const [start, setStart] = useState(initial.startTime ?? "12:00");
  const [end, setEnd] = useState(initial.endTime ?? "17:00");

  // Checked as soon as a time changes, so mistakes show right away (the server checks again).
  const startProblem = timeProblem(start);
  const endProblem = timeProblem(end);
  const orderProblem = !startProblem && !endProblem && start >= end;
  const message = startProblem ?? endProblem ?? (orderProblem ? "The end time must be after the start time." : null);
  const shownError = kind === "CUSTOM" ? (message ?? error) : error;

  return (
    <fieldset aria-describedby={shownError ? `${id}-error` : undefined}>
      <legend className="sr-only">{legend}</legend>
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-input">
        {choices.map((c) => (
          <label
            key={c.kind}
            className={cn(
              "cursor-pointer border-r border-input px-2 py-2 text-center text-sm last:border-r-0 has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              kind === c.kind ? "bg-mint font-semibold text-teal-dark" : "bg-white hover:bg-slate-50",
            )}
          >
            <input
              type="radio"
              name={`${prefix}kind`}
              value={c.kind}
              checked={kind === c.kind}
              onChange={() => setKind(c.kind)}
              className="sr-only"
            />
            {c.label}
          </label>
        ))}
      </div>
      {kind === "CUSTOM" && (
        <div className="mt-2 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label htmlFor={`${id}-start`}>From</label>
            <TimeCombobox
              id={`${id}-start`}
              name={`${prefix}start`}
              value={start}
              onChange={setStart}
              invalid={!!startProblem || orderProblem}
              errorId={`${id}-error`}
            />
            <label htmlFor={`${id}-end`}>to</label>
            <TimeCombobox
              id={`${id}-end`}
              name={`${prefix}end`}
              value={end}
              onChange={setEnd}
              invalid={!!endProblem || orderProblem}
              errorId={`${id}-error`}
            />
          </div>
          <p className="text-xs text-muted-foreground">Type a time (like 12:15 PM) or pick one from the list. Times go in 15-minute steps.</p>
        </div>
      )}
      <p id={`${id}-error`} aria-live="polite" className={cn("text-sm font-medium text-destructive", shownError && "mt-2")}>
        {shownError && (
          <>
            <TriangleAlertIcon className="mr-1 inline size-4 -translate-y-px" aria-hidden />
            {shownError}
          </>
        )}
      </p>
    </fieldset>
  );
}
