"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, submitWithoutReset } from "@/components/forms/fields";
import { saveDefaultWeek } from "@/lib/availability-actions";
import type { DaySetting } from "@/lib/availability";
import { WEEKDAYS } from "@/lib/dates";
import { idleState } from "@/lib/form-state";
import { DayEditor } from "./day-editor";

export function DefaultWeekForm({ membershipId, days }: { membershipId: string; days: DaySetting[] }) {
  const [state, action, pending] = useActionState(saveDefaultWeek, idleState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form onSubmit={submitWithoutReset(action)} noValidate className="space-y-4">
      <input type="hidden" name="membershipId" value={membershipId} />
      <FormMessage state={state} />
      <ul className="space-y-3">
        {WEEKDAYS.map((name, i) => (
          <li key={name} className="rounded-xl border bg-white p-3 sm:grid sm:grid-cols-[8rem_1fr] sm:items-start sm:gap-4">
            <span className="mb-2 block font-semibold sm:mt-2 sm:mb-0">{name}</span>
            <DayEditor legend={name} prefix={`d${i + 1}-`} initial={days[i]} error={errors[`d${i + 1}`]} />
          </li>
        ))}
      </ul>
      <SubmitButton pendingText="Saving…" pending={pending} className="w-full sm:w-auto">
        Save default week
      </SubmitButton>
    </form>
  );
}
