"use client";

import { CircleCheckIcon } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, SubmitButton, submitWithoutReset } from "@/components/forms/fields";
import { sendWeek } from "@/lib/availability-actions";
import { type DaySetting, describe } from "@/lib/availability";
import { idleState } from "@/lib/form-state";
import { DayEditor } from "./day-editor";

export type WeekFormDay = {
  date: string;
  /** "Monday, Nov 30" */
  label: string;
  /** What was sent for this day, or null while it's empty. */
  initial: DaySetting | null;
  /** Set when the day can't be changed here, e.g. "Time off" or "Past". Shown instead of the choices. */
  fixed?: { text: string; detail: string };
};

/**
 * One week of availability, a row per day, sent together with one button.
 * The week starts empty: every day needs a choice before it can be sent.
 */
export function WeekForm({
  membershipId,
  weekStart,
  days,
  sent,
  locked,
  submitLabel,
  pendingText,
}: {
  membershipId: string;
  weekStart: string;
  days: WeekFormDay[];
  /** "Sent Wednesday, Nov 25" when it's been sent, else null. */
  sent: string | null;
  /** Past the deadline: shown, but can't be changed. */
  locked: boolean;
  submitLabel: string;
  pendingText: string;
}) {
  const [state, action, pending] = useActionState(sendWeek, idleState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={submitWithoutReset(action)} noValidate className="space-y-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <input type="hidden" name="weekStart" value={weekStart} />
      {sent && state.status === "idle" && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-mint px-4 py-3 text-sm font-medium text-teal-dark">
          <CircleCheckIcon className="size-4 shrink-0" aria-hidden />
          {sent}
        </p>
      )}
      <FormMessage state={state} />
      <ul className="space-y-3">
        {days.map((d, i) => (
          <li key={d.date} className="rounded-xl border bg-white p-3 sm:grid sm:grid-cols-[10rem_1fr] sm:items-start sm:gap-4">
            <span className="mb-2 block font-semibold sm:mt-2 sm:mb-0">{d.label}</span>
            {d.fixed || locked ? (
              <p className="text-sm text-muted-foreground sm:mt-2">
                {d.fixed ? (
                  <>
                    <span className="font-semibold text-foreground">{d.fixed.text}</span> · {d.fixed.detail}
                  </>
                ) : (
                  d.initial ? describe(d.initial) : "Not sent"
                )}
              </p>
            ) : (
              <>
                <input type="hidden" name={`d${i + 1}-shown`} value="1" />
                <DayEditor legend={d.label} prefix={`d${i + 1}-`} initial={d.initial} error={errors[`d${i + 1}`]} />
              </>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <SubmitButton pendingText={pendingText} pending={pending} className="w-full sm:w-auto">
          {submitLabel}
        </SubmitButton>
      )}
    </form>
  );
}
