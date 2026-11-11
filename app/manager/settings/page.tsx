import type { Metadata } from "next";
import { getBusinessSettings } from "@/lib/availability-data";
import { requireManager } from "@/lib/session";
import { AvailabilitySettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { membership } = await requireManager();
  const settings = await getBusinessSettings(membership.businessId);
  const isOwner = membership.role === "OWNER";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">{settings.name}</p>
      </div>
      {!isOwner && (
        <p role="status" className="rounded-lg border bg-white px-4 py-3 text-sm text-muted-foreground">
          Only the owner can change these settings.
        </p>
      )}
      <AvailabilitySettingsForm
        disabled={!isOwner}
        initial={{
          deadlineEnabled: settings.deadline.enabled,
          deadlineDay: settings.deadline.day,
          deadlineTime: settings.deadline.time,
          timeOffApprovalRequired: settings.timeOffApprovalRequired,
        }}
      />
    </div>
  );
}
