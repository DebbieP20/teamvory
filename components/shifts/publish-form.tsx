"use client";

import { SendIcon } from "lucide-react";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms/fields";
import { idleState } from "@/lib/form-state";
import { publishSchedule } from "@/lib/schedule-actions";

/**
 * Publish & email team. Asks first when shifts are still short or have too many people,
 * since publishing with gaps is sometimes what the owner wants (they cover them).
 */
export function PublishForm({
  monday,
  firstPublish,
  hasChanges,
  problems,
}: {
  monday: string;
  firstPublish: boolean;
  hasChanges: boolean;
  /** e.g. "2 shifts still need people" */
  problems: string[];
}) {
  const [state, action, pending] = useActionState(publishSchedule, idleState);
  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (problems.length && !confirm(`${problems.join(". ")}.\n\nPublish anyway?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="monday" value={monday} />
        <SubmitButton pending={pending} pendingText="Publishing…" disabled={pending || !hasChanges} className="gap-2">
          <SendIcon className="size-4" aria-hidden />
          {firstPublish ? "Publish & email team" : "Publish changes"}
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
