"use client";

import { useActionState, useId, useState } from "react";
import { FormMessage, SubmitButton, submitWithoutReset } from "@/components/forms/fields";
import { saveAvailabilitySettings } from "@/lib/availability-actions";
import { formatTime, TIME_OPTIONS, WEEKDAYS } from "@/lib/dates";
import { idleState } from "@/lib/form-state";
import { describeReminderDays } from "@/lib/reminders";

type Initial = {
  deadlineEnabled: boolean;
  deadlineDay: number;
  deadlineTime: string;
  timeOffApprovalRequired: boolean;
  reminderEnabled: boolean;
  reminderStartDay: number;
  reminderDays: number;
  reminderIncludeDefaultOnly: boolean;
  swapApprovalMode: "AUTOMATIC" | "MANAGER_APPROVAL";
};

const selectClass =
  "h-10 rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60";

export function AvailabilitySettingsForm({ initial, disabled }: { initial: Initial; disabled: boolean }) {
  const [state, action, pending] = useActionState(saveAvailabilitySettings, idleState);
  const [deadlineOn, setDeadlineOn] = useState(initial.deadlineEnabled);
  const [remindersOn, setRemindersOn] = useState(initial.reminderEnabled);
  const [startDay, setStartDay] = useState(initial.reminderStartDay);
  // Reminders stay in the week before the scheduled week, so they can't run past Sunday.
  const [days, setDays] = useState(Math.min(initial.reminderDays, 8 - initial.reminderStartDay));
  const maxDays = 8 - startDay;
  const [swapMode, setSwapMode] = useState(initial.swapApprovalMode);
  const id = useId();

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-6">
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

        <section className="rounded-xl border bg-white p-6" aria-labelledby={`${id}-reminders`}>
          <h2 id={`${id}-reminders`} className="text-lg">Availability reminders</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            An email in the morning to people who haven&apos;t set their availability for next week. It stops for each person as soon
            as they set it.
          </p>
          <label className="mt-4 flex items-center gap-3 font-medium">
            <input
              type="checkbox"
              name="reminderEnabled"
              checked={remindersOn}
              onChange={(e) => setRemindersOn(e.target.checked)}
              className="size-5 accent-teal-600"
            />
            Send availability reminders
          </label>
          <div className="mt-4 space-y-4" hidden={!remindersOn}>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label htmlFor={`${id}-rstart`} className="block text-sm font-medium">Starting</label>
                <select
                  id={`${id}-rstart`}
                  name="reminderStartDay"
                  value={startDay}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setStartDay(d);
                    setDays((n) => Math.min(n, 8 - d));
                  }}
                  className={selectClass}
                >
                  {WEEKDAYS.map((d, i) => (
                    <option key={d} value={i + 1}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor={`${id}-rdays`} className="block text-sm font-medium">for</label>
                <select
                  id={`${id}-rdays`}
                  name="reminderDays"
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className={selectClass}
                >
                  {Array.from({ length: maxDays }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "day" : "days in a row"}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Sent each {describeReminderDays({ startDay, days })} morning, about 9 AM.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="reminderIncludeDefaultOnly"
                defaultChecked={initial.reminderIncludeDefaultOnly}
                className="mt-0.5 size-5 accent-teal-600"
              />
              Also remind people who only use their default week, to check it&apos;s still right
            </label>
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

        <section className="rounded-xl border bg-white p-6" aria-labelledby={`${id}-swaps`}>
          <h2 id={`${id}-swaps`} className="text-lg">Swaps and open shifts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Employees can swap shifts with a coworker (who must accept) or post a shift they can&apos;t work for anyone to pick up.
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-swaps`} className="mt-4 space-y-3">
            {(
              [
                ["AUTOMATIC", "Automatic", "A swap or pickup changes the schedule right away. You get an email about it."],
                ["MANAGER_APPROVAL", "Manager approves", "It waits on your dashboard until you approve it. Until then nothing changes."],
              ] as const
            ).map(([value, label, help]) => (
              <label key={value} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="swapApprovalMode"
                  value={value}
                  checked={swapMode === value}
                  onChange={() => setSwapMode(value)}
                  className="mt-1 size-5 accent-teal-600"
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-sm text-muted-foreground">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {!disabled && (
          <SubmitButton pendingText="Saving…" pending={pending}>
            Save settings
          </SubmitButton>
        )}
      </fieldset>
    </form>
  );
}
