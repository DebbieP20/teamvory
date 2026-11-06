"use client";

import { useId, useState } from "react";
import type { DaySetting, Kind } from "@/lib/availability";
import { TIME_OPTIONS, formatTime } from "@/lib/dates";
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

  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
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
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={`${id}-start`}>From</label>
          <TimeSelect id={`${id}-start`} name={`${prefix}start`} defaultValue={initial.startTime ?? "12:00"} />
          <label htmlFor={`${id}-end`}>to</label>
          <TimeSelect id={`${id}-end`} name={`${prefix}end`} defaultValue={initial.endTime ?? "17:00"} />
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function TimeSelect({ id, name, defaultValue }: { id: string; name: string; defaultValue: string }) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      className="h-9 rounded-lg border border-input bg-white px-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {TIME_OPTIONS.map((t) => (
        <option key={t} value={t}>
          {formatTime(t)}
        </option>
      ))}
    </select>
  );
}
