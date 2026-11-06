"use client";

import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useActionState, useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ContactFormState, contactLimits } from "@/lib/contact";
import { sendContactMessage } from "./actions";

const initialState: ContactFormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContactMessage, initialState);
  // Unique ids: Next.js keeps visited pages mounted (hidden), so fixed ids could clash.
  const uid = useId();
  const ids = { name: `${uid}-name`, email: `${uid}-email`, message: `${uid}-message` };

  if (state.status === "success") {
    return (
      <div role="status" className="rounded-xl border border-teal/40 bg-mint p-8">
        <CheckCircle2Icon className="size-8 text-teal-dark" aria-hidden />
        <h2 className="mt-4 text-xl">Thanks, your message was sent.</h2>
        <p className="mt-2 text-navy/80">We&apos;ll reply to the email address you gave us.</p>
      </div>
    );
  }

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const values = state.status === "error" ? (state.values ?? {}) : {};

  return (
    <form action={formAction} noValidate className="space-y-5 rounded-xl border bg-white p-6 sm:p-8">
      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Field id={ids.name} label="Your name" error={errors.name}>
        <Input
          id={ids.name}
          name="name"
          autoComplete="name"
          required
          maxLength={contactLimits.name}
          defaultValue={values.name}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? `${ids.name}-error` : undefined}
          className="h-10"
        />
      </Field>

      <Field id={ids.email} label="Email" error={errors.email}>
        <Input
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={contactLimits.email}
          defaultValue={values.email}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? `${ids.email}-error` : undefined}
          className="h-10"
        />
      </Field>

      <Field id={ids.message} label="Message" error={errors.message}>
        <Textarea
          id={ids.message}
          name="message"
          required
          rows={6}
          maxLength={contactLimits.message}
          defaultValue={values.message}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? `${ids.message}-error` : undefined}
          className="min-h-36"
        />
      </Field>

      {/* Spam trap: hidden from people and screen readers, so only bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Button type="submit" size="lg" disabled={pending} className="h-11 w-full px-6 font-semibold sm:w-auto">
        {pending && <Loader2Icon className="animate-spin" data-icon="inline-start" />}
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
