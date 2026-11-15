import { expect, type Page } from "@playwright/test";
import { editableWeeks } from "../lib/availability";
import { addDays, formatDay, nowInZone } from "../lib/dates";
import { describeShift } from "../lib/schedule";

// Shared by the schedule and publish tests.

export const weeks = () => editableWeeks(nowInZone("America/New_York").date);
export const next = (offset: number) => addDays(weeks().nextWeek, offset);
export const shiftLabel = (offset: number, startTime: string, endTime: string) => describeShift({ date: next(offset), startTime, endTime });

/** Shift setup (next week unless told): apply a pattern to some days (0 = Monday). */
export async function applyPattern(page: Page, pattern: string, dayOffsets: number[], week: "this" | "next" = "next") {
  const monday = week === "next" ? weeks().nextWeek : weeks().thisWeek;
  await page.goto(`/manager/shifts?week=${week}`);
  const select = page.getByLabel("Pattern");
  const value = await select.getByRole("option", { name: new RegExp(`^${pattern} \\(`) }).getAttribute("value");
  await select.selectOption(value!);
  for (const d of dayOffsets) await page.getByRole("checkbox", { name: formatDay(addDays(monday, d)) }).check();
  // Replacing existing shifts asks for confirmation.
  const accept = (d: { accept: () => Promise<void> }) => void d.accept();
  page.on("dialog", accept);
  await page.getByRole("button", { name: "Apply to ticked days" }).click();
  await expect(page.getByText(`${pattern} applied to ${dayOffsets.length} day`)).toBeVisible();
  page.off("dialog", accept);
}

/** A day in someone's regular week: off, all day, or custom hours like ["12pm", "5pm"]. */
export type DayChoice = "Off" | "All day" | [from: string, to: string];

export async function setDefaultWeek(employee: Page, kinds: DayChoice[]) {
  await employee.goto("/employee/availability");
  const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  for (let i = 0; i < 7; i++) {
    const day = employee.getByRole("group", { name: names[i] });
    const kind = kinds[i];
    if (typeof kind === "string") {
      await day.getByText(kind, { exact: true }).click();
      continue;
    }
    await day.getByText("Custom", { exact: true }).click();
    await day.getByLabel("From", { exact: true }).fill(kind[0]);
    await day.getByLabel("To", { exact: true }).fill(kind[1]);
    await day.getByLabel("To", { exact: true }).blur();
  }
  await employee.getByRole("button", { name: "Save default week" }).click();
  await expect(employee.getByText("Default week saved.")).toBeVisible();
}
