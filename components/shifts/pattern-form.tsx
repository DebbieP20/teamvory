"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { FormMessage, SubmitButton, TextField, submitWithoutReset } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { idleState } from "@/lib/form-state";
import type { PatternShift } from "@/lib/schedule";
import { savePattern } from "@/lib/schedule-actions";
import { ShiftFields } from "./shift-fields";

/** Create or edit a pattern: a name and one or more shifts. */
export function PatternForm({ pattern }: { pattern?: { id: string; name: string; shifts: PatternShift[] } }) {
  const [state, action, pending] = useActionState(savePattern, idleState);
  const [rows, setRows] = useState(() =>
    (pattern?.shifts ?? [{ start: "12:00", end: "17:00", required: 1 }]).map((s, i) => ({ key: i, ...s })),
  );
  const [nextKey, setNextKey] = useState(rows.length);

  return (
    <form onSubmit={submitWithoutReset(action)} noValidate className="space-y-4">
      {pattern && <input type="hidden" name="patternId" value={pattern.id} />}
      <FormMessage state={state} />
      <TextField name="name" label="Pattern name" defaultValue={pattern?.name} maxLength={40} required state={state} className="max-w-xs" />
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-start gap-2">
            <ShiftFields label={`Shift ${i + 1}`} initial={row} />
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={`Remove shift ${i + 1}`}
                onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
              >
                <XIcon />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => {
            setRows((r) => [...r, { key: nextKey, start: "17:00", end: "21:00", required: 1 }]);
            setNextKey((k) => k + 1);
          }}
        >
          <PlusIcon data-icon="inline-start" /> Add a shift
        </Button>
        <SubmitButton pendingText="Saving…" pending={pending}>
          {pattern ? "Save pattern" : "Create pattern"}
        </SubmitButton>
      </div>
    </form>
  );
}
