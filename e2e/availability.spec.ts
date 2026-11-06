import { expect, type Page, test } from "@playwright/test";
import { editableWeeks } from "../lib/availability";
import { addDays, formatDay, nowInZone } from "../lib/dates";
import { ownerWithEmployee, waitForEmail } from "./helpers";

const weeks = () => editableWeeks(nowInZone("America/New_York").date);
const nextWeekDay = (offset: number) => formatDay(addDays(weeks().nextWeek, offset));

function day(page: Page, name: string) {
  return page.getByRole("group", { name });
}
async function choose(page: Page, dayName: string, option: "Off" | "All day" | "Custom") {
  await day(page, dayName).getByText(option, { exact: true }).click();
}

test("employee sets a default week and the manager sees it", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);

  await employee.getByRole("link", { name: "Set your availability" }).click();
  await expect(employee.getByRole("heading", { level: 1, name: "My availability" })).toBeVisible();
  await choose(employee, "Monday", "All day");
  await choose(employee, "Tuesday", "Custom");
  await day(employee, "Tuesday").getByLabel("From", { exact: true }).selectOption("14:00");
  await day(employee, "Tuesday").getByLabel("to", { exact: true }).selectOption("21:00");
  await employee.getByRole("button", { name: "Save default week" }).click();
  await expect(employee.getByText("Default week saved.")).toBeVisible();

  await employee.reload();
  await expect(day(employee, "Monday").getByRole("radio", { name: "All day" })).toBeChecked();
  await expect(day(employee, "Tuesday").getByLabel("From", { exact: true })).toHaveValue("14:00");

  await page.goto("/manager/availability?week=next");
  const row = page.getByRole("row", { name: /Eli Employee/ });
  await expect(row.getByRole("cell").nth(0)).toHaveText("All day");
  await expect(row.getByRole("cell").nth(1)).toHaveText("2–9 PM");
  await expect(row.getByRole("cell").nth(2)).toHaveText("Off");
  await employeeContext.close();
});

test("custom times must end after they start", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await employee.goto("/employee/availability");
  await choose(employee, "Friday", "Custom");
  await day(employee, "Friday").getByLabel("From", { exact: true }).selectOption("17:00");
  await day(employee, "Friday").getByLabel("to", { exact: true }).selectOption("12:00");
  await employee.getByRole("button", { name: "Save default week" }).click();
  await expect(day(employee, "Friday").getByText("The end time must be after the start time.")).toBeVisible();
  await employeeContext.close();
});

test("changing one day of next week, then resetting it", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await employee.goto("/employee/availability");
  await employee.getByRole("button", { name: "Save default week" }).click(); // all days Off
  await expect(employee.getByText("Default week saved.")).toBeVisible();

  await employee.goto("/employee/availability/week?week=next");
  const wednesday = nextWeekDay(2);
  await employee.getByRole("button", { name: `Change: ${wednesday}` }).click();
  await choose(employee, wednesday, "All day");
  await employee.getByRole("button", { name: `Save for ${wednesday}` }).click();
  const row = employee.getByRole("listitem").filter({ hasText: wednesday });
  await expect(row.getByText("Changed")).toBeVisible();
  await expect(row.getByText("All day")).toBeVisible();

  // Only that date changed: the default week is untouched.
  await employee.goto("/employee/availability");
  await expect(day(employee, "Wednesday").getByRole("radio", { name: "Off" })).toBeChecked();

  await employee.goto("/employee/availability/week?week=next");
  await employee.getByRole("button", { name: `Reset to default: ${wednesday}` }).click();
  await expect(employee.getByRole("listitem").filter({ hasText: wednesday }).getByText("Default")).toBeVisible();
  await employeeContext.close();
});

test("time off shows on the team overview and can be removed", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await employee.goto("/employee/availability/time-off");
  await employee.getByLabel("First day").fill(addDays(weeks().nextWeek, 1));
  await employee.getByLabel("Last day").fill(addDays(weeks().nextWeek, 2));
  await employee.getByLabel("Note (optional)").fill("Family trip");
  await employee.getByRole("button", { name: "Add time off" }).click();
  await expect(employee.getByText("Time off added.")).toBeVisible();
  const label = `${nextWeekDay(1)} – ${nextWeekDay(2)}`;
  await expect(employee.getByText(label)).toBeVisible();

  await page.goto("/manager/availability?week=next");
  const row = page.getByRole("row", { name: /Eli Employee/ });
  await expect(row.getByRole("cell").nth(1)).toHaveText("Time off");
  await expect(row.getByRole("cell").nth(2)).toHaveText("Time off");
  await expect(page.getByRole("region", { name: "Upcoming time off" }).getByText("Family trip")).toBeVisible();

  await employee.getByRole("button", { name: `Remove: ${label}` }).click();
  await expect(employee.getByText("No upcoming time off.")).toBeVisible();
  await employeeContext.close();
});

test("with approval on, time off waits for the manager", async ({ page, browser }, testInfo) => {
  const { employee, employeeEmail, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await page.goto("/manager/settings");
  await page.getByLabel("Managers approve time off").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await employee.goto("/employee/availability/time-off");
  await employee.getByLabel("First day").fill(addDays(weeks().nextWeek, 4));
  await employee.getByLabel("Last day").fill(addDays(weeks().nextWeek, 4));
  await employee.getByRole("button", { name: "Add time off" }).click();
  await expect(employee.getByText("Time off requested.")).toBeVisible();
  await expect(employee.getByText("Waiting for approval")).toBeVisible();

  await page.goto("/manager");
  await page.getByRole("link", { name: /1 time-off request is waiting/ }).click();
  const row = page.getByRole("row", { name: /Eli Employee/ });
  await page.goto("/manager/availability?week=next");
  await expect(row.getByRole("cell").nth(4)).toHaveText("Pending");
  await page.getByRole("button", { name: /^Approve: Eli Employee/ }).click();
  await expect(row.getByRole("cell").nth(4)).toHaveText("Time off");

  const email = await waitForEmail(employeeEmail, /approved/);
  expect(email.text).toContain(nextWeekDay(4));
  await employee.reload();
  await expect(employee.getByText("Waiting for approval")).toBeHidden();
  await employeeContext.close();
});

test("after the deadline, employees can't change that week but managers can", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await page.goto("/manager/settings");
  await page.getByLabel("Use an availability deadline").check();
  await page.getByLabel("Every").selectOption("7"); // Sunday...
  await page.getByLabel("at").selectOption("23:30"); // ...11:30 PM, so this week is past its deadline
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await employee.goto("/employee/availability/week?week=this");
  await expect(employee.getByText("The availability deadline for this week has passed.")).toBeVisible();
  await expect(employee.getByRole("button", { name: /^Change:/ })).toHaveCount(0);

  // The manager can still change it for them.
  await page.goto("/manager/availability?week=this");
  await page.getByRole("link", { name: "Eli Employee" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Eli Employee's availability" })).toBeVisible();
  await expect(page.getByText("The availability deadline for this week has passed.")).toHaveCount(0);
  await employeeContext.close();
});

test("a manager sets someone's default week for them", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await page.goto("/manager/availability");
  await page.getByRole("link", { name: "Eli Employee" }).click();
  await choose(page, "Saturday", "All day");
  await page.getByRole("button", { name: "Save default week" }).click();
  await expect(page.getByText("Default week saved.")).toBeVisible();

  await employee.goto("/employee/availability");
  await expect(day(employee, "Saturday").getByRole("radio", { name: "All day" })).toBeChecked();
  await employeeContext.close();
});

test("the owner starts available all day, every day", async ({ page, browser }, testInfo) => {
  const { employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await page.goto("/manager/availability");
  const row = page.getByRole("row", { name: /Dana Owner/ });
  for (let i = 0; i < 7; i++) await expect(row.getByRole("cell").nth(i)).toHaveText("All day");
  await employeeContext.close();
});

