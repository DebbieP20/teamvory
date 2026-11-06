"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { reviewTimeOff } from "@/lib/availability-actions";

function Submit({ decision, label }: { decision: "APPROVED" | "DECLINED"; label: string }) {
  const { pending } = useFormStatus();
  const text = decision === "APPROVED" ? "Approve" : "Decline";
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="lg"
      variant={decision === "APPROVED" ? "default" : "outline"}
      disabled={pending}
      aria-label={`${text}: ${label}`}
      className={decision === "APPROVED" ? "font-semibold" : undefined}
    >
      {text}
    </Button>
  );
}

export function ReviewButtons({ timeOffId, label }: { timeOffId: string; label: string }) {
  return (
    <form action={reviewTimeOff} className="flex gap-2">
      <input type="hidden" name="timeOffId" value={timeOffId} />
      <Submit decision="APPROVED" label={label} />
      <Submit decision="DECLINED" label={label} />
    </form>
  );
}
