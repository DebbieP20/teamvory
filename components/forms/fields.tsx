"use client";

import { Loader2Icon } from "lucide-react";
import { startTransition, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

/**
 * A labelled text input with its error message, wired for screen readers.
 * IDs come from useId(): Next.js keeps recently visited pages mounted (hidden),
 * so a fixed id like "email" could clash with a hidden page's input.
 */
export function TextField({
  name,
  label,
  state,
  hint,
  className,
  ...props
}: {
  name: string;
  label: string;
  state: FormState;
  hint?: string;
} & Omit<React.ComponentProps<"input">, "name">) {
  const id = useId();
  // A server error stays until the person edits the field. (Clearing it matters:
  // submitWithoutReset won't send a form that still has an invalid field.)
  const [editedSince, setEditedSince] = useState<FormState | null>(null);
  const error = state.status === "error" && editedSince !== state ? state.fieldErrors?.[name] : undefined;
  const value = state.status === "error" && props.type !== "password" ? state.values?.[name] : undefined;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...props}
        id={id}
        name={name}
        defaultValue={value ?? props.defaultValue}
        onChange={(e) => {
          setEditedSince(state);
          props.onChange?.(e);
        }}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="h-10"
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** The form-level message (e.g. "Email or password is incorrect."). */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "error" && state.message) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive">
        {state.message}
      </p>
    );
  }
  if (state.status === "success" && state.message) {
    return (
      <p role="status" className="rounded-lg bg-mint px-4 py-3 text-sm text-teal-dark">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SubmitButton({
  children,
  pendingText,
  pending: pendingProp,
  className,
  ...props
}: { pendingText: string; pending?: boolean } & React.ComponentProps<typeof Button>) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" size="lg" disabled={pending} className={cn("h-11 px-6 font-semibold", className)} {...props}>
      {pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
      {pending ? pendingText : children}
    </Button>
  );
}

/**
 * onSubmit handler that runs a form action WITHOUT React's automatic form reset.
 * Use it for forms with controlled choices (radio groups, checkboxes): the reset
 * would clear those in the page while React still shows them as chosen, so the
 * next save would send the wrong values. Pair with SubmitButton's `pending` prop.
 */
export function submitWithoutReset(dispatch: (formData: FormData) => void) {
  return (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (focusFirstInvalid(event.currentTarget)) return;
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
}

/** If a field in the form is marked invalid, moves focus to it and returns true. */
export function focusFirstInvalid(form: HTMLFormElement): boolean {
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  if (!invalid) return false;
  invalid.focus();
  invalid.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
