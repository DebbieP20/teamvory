"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { FormMessage, SubmitButton, submitWithoutReset } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/form-state";
import type { FormState } from "@/lib/form-state";
import { postOpenShift, requestSwap } from "@/lib/request-actions";
import { cn } from "@/lib/utils";
import { useResultBanner } from "./result-banner";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * A one-click request button (Pick up, Accept, Decline, Cancel, Approve) with its
 * message underneath. `fields` become hidden inputs.
 */
export function RequestButton({
  action,
  fields,
  label,
  pendingText,
  confirmText,
  variant = "primary",
  ariaLabel,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  pendingText: string;
  confirmText?: string;
  variant?: "primary" | "secondary" | "danger";
  ariaLabel?: string;
}) {
  const banner = useResultBanner();
  const [state, setState] = useState<FormState>(idleState);
  const [pending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (confirmText && !confirm(confirmText)) return;
          const formData = new FormData(e.currentTarget);
          startTransition(async () => {
            const result = await action(idleState, formData);
            // This row may disappear with the refreshed page, so the banner (if any) shows the result.
            if (banner) banner(result);
            else setState(result);
          });
        }}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <SubmitButton
          pending={pending}
          pendingText={pendingText}
          aria-label={ariaLabel}
          variant={variant === "primary" ? "default" : "outline"}
          className={cn("h-10 px-4", variant === "danger" && "border-red-200 text-destructive hover:bg-red-50")}
        >
          {label}
        </SubmitButton>
      </form>
      {!banner && <FormMessage state={state} />}
    </div>
  );
}

function NoteField({ id }: { id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        Note <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <input
        id={id}
        name="note"
        maxLength={200}
        placeholder="e.g. Family event"
        className="h-10 w-full rounded-lg border border-input bg-white px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </div>
  );
}

/** Give a shift away: post it for anyone eligible to pick up. */
export function PostOpenShiftForm({ shiftId }: { shiftId: string }) {
  const [state, action, pending] = useActionState(postOpenShift, idleState);
  const id = useId();
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="shiftId" value={shiftId} />
      <NoteField id={`${id}-note`} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Posting…">
        Post as open shift
      </SubmitButton>
    </form>
  );
}

/** Ask a coworker to swap: only shifts that work for both are offered. */
export function SwapForm({ shiftId, options }: { shiftId: string; options: { value: string; day: string; time: string; who: string }[] }) {
  const [state, action, pending] = useActionState(requestSwap, idleState);
  const [choice, setChoice] = useState("");
  const id = useId();
  if (state.status === "success") return <FormMessage state={state} />;
  if (!options.length) {
    return <p className="text-muted-foreground">No coworker shift works for both of you this week. Try posting it as an open shift.</p>;
  }
  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="shiftId" value={shiftId} />
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Swap for</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5",
              choice === o.value && "border-teal ring-1 ring-teal",
            )}
          >
            <input
              type="radio"
              name="target"
              value={o.value}
              checked={choice === o.value}
              onChange={() => setChoice(o.value)}
              className="size-5 accent-teal-600"
            />
            <span className="w-24 shrink-0 font-semibold">{o.day}</span>
            <span className="min-w-0">
              <span className="block">{o.time}</span>
              <span className="block text-sm text-muted-foreground">{o.who}&apos;s shift</span>
            </span>
          </label>
        ))}
      </fieldset>
      <NoteField id={`${id}-note`} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingText="Sending…" disabled={pending || !choice}>
          Ask to swap
        </SubmitButton>
        {choice && (
          <Button type="button" variant="ghost" className="h-11" onClick={() => setChoice("")}>
            Clear
          </Button>
        )}
      </div>
    </form>
  );
}
