import { expect, type Page, test } from "@playwright/test";
import { formatDay, formatTime } from "../lib/dates";
import { inviteEmployee, ownerWithEmployee, waitForEmail } from "./helpers";
import { applyPattern, next, setDefaultWeek, shiftLabel } from "./schedule-helpers";

const ALL_DAY = Array(7).fill("All day") as "All day"[];

async function assign(page: Page, label: string, name: string) {
  await page.getByRole("button", { name: `Assign: ${label}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: `Assign ${name}` }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function publish(page: Page) {
  const accept = (d: { accept: () => Promise<void> }) => void d.accept();
  page.on("dialog", accept);
  await page.getByRole("button", { name: /^Publish/ }).click();
  await expect(page.getByText(/^(Version \d+ published|Published)\./)).toBeVisible();
  page.off("dialog", accept);
}

/** Owner plus Eli and Fay, both available all week, with Standard on Monday and Tuesday next week. */
async function team(page: Page, browser: import("@playwright/test").Browser, testInfo: import("@playwright/test").TestInfo) {
  const eli = await ownerWithEmployee(page, browser, testInfo);
  const fay = await inviteEmployee(page, browser, testInfo, "Fay Employee", "fay");
  await setDefaultWeek(eli.employee, ALL_DAY);
  await setDefaultWeek(fay.employee, ALL_DAY);
  await applyPattern(page, "Standard", [0, 1]);
  return { eli, fay };
}

const mondayAfternoon = () => shiftLabel(0, "12:00", "17:00");
const tuesdayAfternoon = () => shiftLabel(1, "12:00", "17:00");
const cantMakeIt = (day: number) => `Can't make it: ${formatDay(next(day))}, ${formatTime("12:00")} – ${formatTime("17:00")}`;

test("an open shift is picked up by a coworker and the schedule updates", async ({ page, browser }, testInfo) => {
  const { eli, fay } = await team(page, browser, testInfo);
  await page.goto("/manager/schedule?week=next");
  await assign(page, mondayAfternoon(), "Eli Employee");
  await publish(page);

  // Eli can't make Monday and posts it.
  await eli.employee.goto("/employee");
  await eli.employee.getByRole("link", { name: cantMakeIt(0) }).click();
  await eli.employee.getByLabel("Note").fill("Dentist");
  await eli.employee.getByRole("button", { name: "Post as open shift" }).click();
  await expect(eli.employee.getByText(/^Posted as an open shift\./)).toBeVisible();
  const posted = await waitForEmail(fay.employeeEmail, /^Open shift:/);
  expect(posted.text).toContain('"Dentist"');

  // The owner sees it on the dashboard.
  await page.goto("/manager");
  await expect(page.getByText(`Open shift: ${mondayAfternoon()}, posted by Eli Employee`)).toBeVisible();

  // Fay picks it up: no one has to accept.
  await fay.employee.goto("/employee/shifts");
  await fay.employee.getByRole("button", { name: `Pick up ${mondayAfternoon()}` }).click();
  await expect(fay.employee.getByText(`It's yours: ${mondayAfternoon()}.`)).toBeVisible();
  await waitForEmail(eli.employeeEmail, /^Fay Employee took your shift/);

  await eli.employee.goto("/employee");
  await expect(eli.employee.getByRole("region", { name: "Next week" }).getByText("You're not on the schedule this week.")).toBeVisible();
  await fay.employee.goto("/employee");
  await expect(fay.employee.getByRole("region", { name: "Next week" }).getByText("With", { exact: false })).toHaveCount(0);
  await expect(fay.employee.getByRole("link", { name: cantMakeIt(0) })).toBeVisible();

  // The manager's draft moved too, so there's nothing left to publish.
  await page.goto("/manager/schedule?week=next");
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: `Unpin: Fay Employee, ${mondayAfternoon()}` }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText(`Open shift:`)).toHaveCount(0);
  await eli.employeeContext.close();
  await fay.employeeContext.close();
});

test("a swap needs the coworker, then the manager when approval is on", async ({ page, browser }, testInfo) => {
  const { eli, fay } = await team(page, browser, testInfo);
  await page.goto("/manager/settings");
  await page.getByLabel("Manager approves").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.goto("/manager/schedule?week=next");
  await assign(page, mondayAfternoon(), "Eli Employee");
  await assign(page, tuesdayAfternoon(), "Fay Employee");
  await publish(page);

  await eli.employee.goto(`/employee`);
  await eli.employee.getByRole("link", { name: cantMakeIt(0) }).click();
  await eli.employee.getByRole("radio", { name: new RegExp(formatDay(next(1))) }).check();
  await eli.employee.getByRole("button", { name: "Ask to swap" }).click();
  await expect(eli.employee.getByText("You asked Fay Employee to swap. You keep your shift unless they accept.")).toBeVisible();
  await waitForEmail(fay.employeeEmail, /^Eli Employee asks to swap shifts/);

  await fay.employee.goto("/employee/shifts");
  await expect(fay.employee.getByText(`You take: ${formatDay(next(0))}`)).toBeVisible();
  await fay.employee.getByRole("button", { name: "Accept" }).click();
  await expect(fay.employee.getByText("Accepted. It now waits for your manager's approval.")).toBeVisible();

  // Nothing changes until the owner approves.
  await eli.employee.goto("/employee");
  await expect(eli.employee.getByText("Waiting for approval")).toBeVisible();

  await page.goto("/manager");
  await expect(page.getByText("Swap to approve")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Approved. The schedule is updated and both people were emailed.")).toBeVisible();
  await waitForEmail(eli.employeeEmail, /^Approved:/);

  await eli.employee.goto("/employee");
  await expect(eli.employee.getByRole("link", { name: cantMakeIt(1) })).toBeVisible();
  await expect(eli.employee.getByRole("link", { name: cantMakeIt(0) })).toHaveCount(0);
  await eli.employeeContext.close();
  await fay.employeeContext.close();
});

test("a request can be cancelled, and you keep the shift", async ({ page, browser }, testInfo) => {
  const { eli, fay } = await team(page, browser, testInfo);
  await page.goto("/manager/schedule?week=next");
  await assign(page, mondayAfternoon(), "Eli Employee");
  await publish(page);

  await eli.employee.goto("/employee");
  await eli.employee.getByRole("link", { name: cantMakeIt(0) }).click();
  await eli.employee.getByRole("button", { name: "Post as open shift" }).click();
  await expect(eli.employee.getByText(/^Posted as an open shift\./)).toBeVisible();

  await eli.employee.goto("/employee/shifts");
  eli.employee.once("dialog", (d) => d.accept());
  await eli.employee.getByRole("button", { name: `Cancel request: ${mondayAfternoon()}` }).click();
  await expect(eli.employee.getByText("Request cancelled. You keep your shift.")).toBeVisible();

  await fay.employee.goto("/employee/shifts");
  await expect(fay.employee.getByText("No open shifts you can work right now.")).toBeVisible();
  await eli.employeeContext.close();
  await fay.employeeContext.close();
});
