"use client";

import { useActionState, useId, useState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { saveAvailabilitySettings } from "@/lib/availability-actions";
import { formatTime, TIME_OPTIONS, WEEKDAYS } from "@/lib/dates";
import { idleState } from "@/lib/form-state";

type Initial = { deadlineEnabled: boolean; deadlineDay: number; deadlineTime: string; timeOffApprovalRequired: boolean };

const selectClass =
  "h-10 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60";

export function AvailabilitySettingsForm({ initial, disabled }: { initial: Initial; disabled: boolean }) {
  const [state, action] = useActionState(saveAvailabilitySettings, idleState);
  const [deadlineOn, setDeadlineOn] = useState(initial.deadlineEnabled);
  const id = useId();

  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <fieldset disabled={disabled} className="space-y-6">
        <section className="rounded-xl border bg-white p-6" aria-labelledby={`${id}-deadline`}>
          <h2 id={`${id}-deadline`} className="text-lg">Availability deadline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Off by default. When it&apos;s on, employees must set next week&apos;s availability by this time. After it, only managers can
            change that week.
          </p>
          <label className="mt-4 flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              name="deadlineEnabled"
              checked={deadlineOn}
              onChange={(e) => setDeadlineOn(e.target.checked)}
              className="size-5 accent-teal-600"
            />
            Use an availability deadline
          </label>
          <div className="mt-4 flex flex-wrap items-end gap-4" hidden={!deadlineOn}>
            <div className="space-y-2">
              <label htmlFor={`${id}-day`} className="block text-sm font-medium">Every</label>
              <select id={`${id}-day`} name="deadlineDay" defaultValue={initial.deadlineDay} className={selectClass}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i + 1}>{d}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label htmlFor={`${id}-time`} className="block text-sm font-medium">at</label>
              <select id={`${id}-time`} name="deadlineTime" defaultValue={initial.deadlineTime} className={selectClass}>
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <p className="pb-2 text-sm text-muted-foreground">for the following week</p>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6" aria-labelledby={`${id}-approval`}>
          <h2 id={`${id}-approval`} className="text-lg">Time-off approval</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Off by default: time off counts as soon as an employee adds it. When it&apos;s on, requests wait until a manager
            approves them. Turning it off approves anything still waiting.
          </p>
          <label className="mt-4 flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              name="timeOffApprovalRequired"
              defaultChecked={initial.timeOffApprovalRequired}
              className="size-5 accent-teal-600"
            />
            Managers approve time off
          </label>
        </section>

        {!disabled && <SubmitButton pendingText="Saving…">Save settings</SubmitButton>}
      </fieldset>
    </form>
  );
}
