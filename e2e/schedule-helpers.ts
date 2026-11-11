import { expect, type Page } from "@playwright/test";
import { editableWeeks } from "../lib/availability";
import { addDays, formatDay, nowInZone } from "../lib/dates";
import { describeShift } from "../lib/schedule";

// Shared by the schedule and publish tests.

export const weeks = () => editableWeeks(nowInZone("America/New_York").date);
export const next = (offset: number) => addDays(weeks().nextWeek, offset);
export const shiftLabel = (offset: number, startTime: string, endTime: string) => describeShift({ date: next(offset), startTime, endTime });

/** Shift setup for next week: apply a pattern to some days (0 = Monday). */
export async function applyPattern(page: Page, pattern: string, dayOffsets: number[]) {
  await page.goto("/manager/shifts?week=next");
  const select = page.getByLabel("Pattern");
  const value = await select.getByRole("option", { name: new RegExp(`^${pattern} \\(`) }).getAttribute("value");
  await select.selectOption(value!);
  for (const d of dayOffsets) await page.getByRole("checkbox", { name: formatDay(next(d)) }).check();
  // Replacing existing shifts asks for confirmation.
  const accept = (d: { accept: () => Promise<void> }) => void d.accept();
  page.on("dialog", accept);
  await page.getByRole("button", { name: "Apply to ticked days" }).click();
  await expect(page.getByText(`${pattern} applied to ${dayOffsets.length} day`)).toBeVisible();
  page.off("dialog", accept);
}

export async function setDefaultWeek(employee: Page, kinds: ("Off" | "All day")[]) {
  await employee.goto("/employee/availability");
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (let i = 0; i < 7; i++) await employee.getByRole("group", { name: names[i] }).getByText(kinds[i], { exact: true }).click();
  await employee.getByRole("button", { name: "Save default week" }).click();
  await expect(employee.getByText("Default week saved.")).toBeVisible();
}
