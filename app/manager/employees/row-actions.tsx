"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { changeMemberRole, resendInvitation, revokeInvitation, setMemberStatus } from "./actions";

function SmallButton({ children, label, ...props }: { label: string } & React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending} aria-label={label} {...props}>
      {children}
    </Button>
  );
}

export function InvitationActions({ invitationId, email, canResend }: { invitationId: string; email: string; canResend: boolean }) {
  return (
    <div className="flex gap-2">
      {canResend && (
        <form action={resendInvitation}>
          <input type="hidden" name="invitationId" value={invitationId} />
          <SmallButton label={`Resend: ${email}`}>Resend</SmallButton>
        </form>
      )}
      <form
        action={revokeInvitation}
        onSubmit={(e) => {
          if (!confirm(`Cancel the invitation for ${email}? The link in their email will stop working.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="invitationId" value={invitationId} />
        <SmallButton label={`Cancel: ${email}`}>Cancel</SmallButton>
      </form>
    </div>
  );
}

export function MemberActions({
  membershipId,
  name,
  role,
  status,
  canManage,
  canPromote,
}: {
  membershipId: string;
  name: string;
  role: "OWNER" | "MANAGER" | "EMPLOYEE";
  status: "ACTIVE" | "INACTIVE";
  canManage: boolean;
  canPromote: boolean;
}) {
  if (!canManage) return null;
  const deactivate = status === "ACTIVE";
  return (
    <div className="flex flex-wrap gap-2">
      {canPromote && status === "ACTIVE" && (
        <form action={changeMemberRole}>
          <input type="hidden" name="membershipId" value={membershipId} />
          <input type="hidden" name="role" value={role === "MANAGER" ? "EMPLOYEE" : "MANAGER"} />
          <SmallButton label={`${role === "MANAGER" ? "Make employee" : "Make manager"}: ${name}`}>
            {role === "MANAGER" ? "Make employee" : "Make manager"}
          </SmallButton>
        </form>
      )}
      <form
        action={setMemberStatus}
        onSubmit={(e) => {
          if (deactivate && !confirm(`Set ${name} to inactive? They won't be able to use TeamVory until you turn them back on. Their history is kept.`)) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="membershipId" value={membershipId} />
        <input type="hidden" name="status" value={deactivate ? "INACTIVE" : "ACTIVE"} />
        <SmallButton label={`${deactivate ? "Set inactive" : "Set active"}: ${name}`}>
          {deactivate ? "Set inactive" : "Set active"}
        </SmallButton>
      </form>
    </div>
  );
}
