"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { resetDayChange, saveDayChange } from "@/lib/availability-actions";
import type { DaySetting, ResolvedDay } from "@/lib/availability";
import { idleState } from "@/lib/form-state";
import { cn } from "@/lib/utils";
import { DayEditor } from "./day-editor";

const sourceLabel: Record<ResolvedDay["source"], { text: string; className: string }> = {
  default: { text: "Default", className: "bg-slate-100 text-slate-600" },
  change: { text: "Changed", className: "bg-mint text-teal-dark" },
  "time-off": { text: "Time off", className: "bg-violet-100 text-violet-800" },
  "pending-time-off": { text: "Time off pending", className: "bg-amber-100 text-amber-900" },
  "not-set": { text: "Not set", className: "bg-slate-100 text-slate-600" },
};

export function WeekDayRow({
  membershipId,
  date,
  label,
  resolved,
  description,
  editable,
}: {
  membershipId: string;
  date: string;
  label: string;
  resolved: ResolvedDay;
  description: string;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [saveState, save] = useActionState(saveDayChange, idleState);
  const [resetState, reset] = useActionState(resetDayChange, idleState);
  const pill = sourceLabel[resolved.source];
  const isTimeOff = resolved.source === "time-off" || resolved.source === "pending-time-off";
  const initial: DaySetting = isTimeOff ? { kind: "OFF" } : resolved;

  return (
    <li className="rounded-xl border bg-white p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{label}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", pill.className)}>{pill.text}</span>
        <span className="ml-auto text-sm text-muted-foreground">{description}</span>
        {editable && !isTimeOff && !open && (
          <Button variant="outline" size="lg" onClick={() => setOpen(true)} aria-label={`Change: ${label}`}>
            Change
          </Button>
        )}
      </div>
      <FormMessage state={saveState.status === "error" ? saveState : resetState} />
      {open && (
        <div className="mt-3 space-y-3">
          <form action={save} className="space-y-3" onSubmit={() => setOpen(false)}>
            <input type="hidden" name="membershipId" value={membershipId} />
            <input type="hidden" name="date" value={date} />
            <DayEditor legend={label} initial={initial} />
            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingText="Saving…" size="lg">
                Save for {label}
              </SubmitButton>
              <Button type="button" variant="ghost" size="lg" className="h-11" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
      {editable && resolved.source === "change" && !open && (
        <form action={reset} className="mt-2">
          <input type="hidden" name="membershipId" value={membershipId} />
          <input type="hidden" name="date" value={date} />
          <button type="submit" className="text-sm font-semibold text-teal-dark hover:underline" aria-label={`Reset to default: ${label}`}>
            Reset to default
          </button>
        </form>
      )}
    </li>
  );
}
