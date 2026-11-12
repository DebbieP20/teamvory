import { expect, test } from "@playwright/test";
import { ownerWithEmployee } from "./helpers";
import { applyPattern, setDefaultWeek, shiftLabel } from "./schedule-helpers";

test("Build schedule fills shifts fairly, the owner covers gaps, and pinned shifts stay", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  // Eli works weekdays only.
  await setDefaultWeek(employee, ["All day", "All day", "All day", "All day", "All day", "Off", "Off"]);
  await applyPattern(page, "Standard", [0, 5]); // Monday and Saturday, 2 people per shift
  const mondayEvening = shiftLabel(0, "17:00", "21:00");

  // The owner picks his own shift first (placed by hand → pinned).
  await page.goto("/manager/schedule?week=next");
  await page.getByRole("button", { name: `Assign: ${mondayEvening}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign Dana Owner" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: "Build schedule" }).click();
  // Monday: Eli on both shifts, the owner covers the second afternoon spot.
  // Saturday: Eli is off, so the owner covers one spot on each shift and one each stays empty.
  await expect(
    page.getByText("Schedule built: 6 of 8 spots filled. You're covering 3 shifts nobody else could. 2 shifts still need people."),
  ).toBeVisible();
  await expect(page.getByRole("listitem").getByText("covering", { exact: true }).filter({ visible: true })).toHaveCount(3);
  await expect(page.getByRole("button", { name: `Unpin: Dana Owner, ${mondayEvening}` }).filter({ visible: true })).toHaveCount(1);

  const hours = page.getByRole("complementary");
  const eli = hours.getByRole("listitem").filter({ hasText: "Eli Employee" });
  await expect(eli).toContainText("9 h · 2 shifts");
  await expect(eli).toContainText("fair: 9 h");
  await expect(hours.getByRole("listitem").filter({ hasText: "Dana Owner" })).toContainText("Backup: covers gaps");

  // Regenerate keeps the owner's pinned shift.
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.getByText(/^Schedule built: 6 of 8 spots filled/)).toBeVisible();
  await expect(page.getByRole("button", { name: `Unpin: Dana Owner, ${mondayEvening}` }).filter({ visible: true })).toHaveCount(1);
  await employeeContext.close();
});
