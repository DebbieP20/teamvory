"use client";

import { cn } from "@/lib/utils";

/**
 * A time box that opens the phone's own time picker: the wheel on iPhone, the clock on
 * Android (on a computer, the browser's time box). Shifts and availability go in 15-minute
 * steps, so a time like 9:10 snaps to the nearest quarter hour (9:15) when the box is left.
 * `value` is "HH:mm", or "" while empty.
 */
export function TimeInput({
  id,
  name,
  value,
  onChange,
  invalid,
  errorId,
  label,
}: {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  errorId?: string;
  /** Accessible name when there's no visible <label for={id}> */
  label?: string;
}) {
  return (
    <input
      id={id}
      name={name}
      type="time"
      step={900}
      value={value}
      aria-label={label}
      aria-invalid={invalid}
      aria-describedby={invalid ? errorId : undefined}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        const rounded = roundToQuarter(e.target.value);
        if (rounded !== e.target.value) onChange(rounded);
      }}
      className={cn(
        // appearance-none and the text alignment: iPhones otherwise show a grey, centered pill.
        "block h-10 w-36 min-w-0 appearance-none rounded-lg border bg-white px-2.5 text-left text-base outline-none focus-visible:ring-3 [&::-webkit-date-and-time-value]:text-left",
        invalid
          ? "border-destructive bg-red-50 text-destructive focus-visible:ring-destructive/30"
          : "border-input focus-visible:border-ring focus-visible:ring-ring/50",
      )}
    />
  );
}

/** "09:10" → "09:15": the nearest quarter hour (never past 23:45). Anything else is returned as is. */
export function roundToQuarter(time: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) return time;
  const minutes = Math.min(23 * 60 + 45, Math.round((Number(match[1]) * 60 + Number(match[2])) / 15) * 15);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** A friendly message if a time can't be used, otherwise null. */
export function timeProblem(time: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "Choose a time.";
  if (Number(time.slice(3)) % 15 !== 0) return "Use :00, :15, :30 or :45, like 12:15 PM.";
  return null;
}
