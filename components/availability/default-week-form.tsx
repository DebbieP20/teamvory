"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { saveDefaultWeek } from "@/lib/availability-actions";
import type { DaySetting } from "@/lib/availability";
import { WEEKDAYS } from "@/lib/dates";
import { idleState } from "@/lib/form-state";
import { DayEditor } from "./day-editor";

export function DefaultWeekForm({ membershipId, days }: { membershipId: string; days: DaySetting[] }) {
  const [state, action] = useActionState(saveDefaultWeek, idleState);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-4">
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
      <SubmitButton pendingText="Saving…" className="w-full sm:w-auto">
        Save default week
      </SubmitButton>
    </form>
  );
}
