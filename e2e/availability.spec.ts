import { expect, type Page, test } from "@playwright/test";
import { editableWeeks, sendableWeeks } from "../lib/availability";
import { addDays, formatDay, formatWeek, nowInZone } from "../lib/dates";
import { ownerWithEmployee, waitForEmail } from "./helpers";

const todayDate = () => nowInZone("America/New_York").date;
const weeks = () => editableWeeks(todayDate());
/** The week employees send now (the coming week), and the one after. */
const sendable = () => sendableWeeks(todayDate());
const firstDay = (offset: number) => formatDay(addDays(sendable().first, offset));
const nextWeekDay = (offset: number) => formatDay(addDays(weeks().nextWeek, offset));

function day(page: Page, name: string) {
  return page.getByRole("group", { name });
}
async function choose(page: Page, dayName: string, option: "Off" | "All day" | "Custom") {
  await day(page, dayName).getByText(option, { exact: true }).click();
}
async function chooseAll(page: Page, option: "Off" | "All day", offsets = [0, 1, 2, 3, 4, 5, 6]) {
  for (const i of offsets) await choose(page, firstDay(i), option);
}

test("the coming week starts empty, and is sent once every day is chosen", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  const week = formatWeek(sendable().first);

  // The manager sees who hasn't sent yet.
  await page.goto("/manager");
  await expect(page.getByRole("link", { name: new RegExp(`1 person hasn't sent their availability for ${week}: Eli Employee`) })).toBeVisible();

  await employee.getByRole("link", { name: `Send your availability for ${week}` }).click();
  await expect(employee.getByRole("heading", { level: 1, name: "My availability" })).toBeVisible();
  await expect(employee.getByRole("link", { name: `This week · ${week}` })).toHaveAttribute("aria-current", "page");
  await expect(employee.getByRole("link", { name: `Next week · ${formatWeek(sendable().second)}` })).toBeVisible();
  // Nothing is filled in for them.
  await expect(employee.getByRole("radio", { checked: true })).toHaveCount(0);

  // Sending with days left empty points them out.
  await choose(employee, firstDay(0), "All day");
  await employee.getByRole("button", { name: "Send my availability" }).click();
  await expect(employee.getByText("Please choose an option for every day.")).toBeVisible();
  await expect(day(employee, firstDay(1)).getByText("Choose Off, All day or Custom.")).toBeVisible();

  await choose(employee, firstDay(1), "Custom");
  await day(employee, firstDay(1)).getByLabel("From", { exact: true }).fill("14:00");
  await day(employee, firstDay(1)).getByLabel("To", { exact: true }).fill("21:00");
  await expect(day(employee, firstDay(1)).getByText("Choose Off, All day or Custom.")).toHaveCount(0);
  await chooseAll(employee, "Off", [2, 3, 4, 5, 6]);
  await employee.getByRole("button", { name: "Send my availability" }).click();
  await expect(employee.getByText(`Sent! Your availability for ${week} is in.`)).toBeVisible();

  await employee.reload();
  await expect(employee.getByText(/^Sent .*You can still change it and send again\./)).toBeVisible();
  await expect(day(employee, firstDay(0)).getByRole("radio", { name: "All day" })).toBeChecked();
  await expect(day(employee, firstDay(1)).getByLabel("From", { exact: true })).toHaveValue("14:00");
  await expect(employee.getByRole("button", { name: "Send again" })).toBeVisible();

  // The week after is still empty: nothing is copied forward.
  await employee.getByRole("link", { name: /^Next week · / }).click();
  await expect(employee.getByRole("radio", { checked: true })).toHaveCount(0);

  await page.goto("/manager/availability?week=next");
  await expect(page.getByText(`Everyone has sent their availability for ${week}.`)).toBeVisible();
  const row = page.getByRole("row", { name: /Eli Employee/ });
  await expect(row.getByRole("cell").nth(0)).toHaveText("All day");
  await expect(row.getByRole("cell").nth(1)).toHaveText("2–9 PM");
  await expect(row.getByRole("cell").nth(2)).toHaveText("Off");
  // The week after shows them as not sent.
  await page.goto("/manager/availability?week=after");
  await expect(page.getByText(/1 person hasn't sent their availability for .*: Eli Employee\./)).toBeVisible();
  await expect(page.getByRole("row", { name: /Eli Employee/ }).getByRole("cell").nth(0)).toHaveText("–");
  await employeeContext.close();
});

test("custom times must end after they start", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await employee.goto("/employee/availability");
  await chooseAll(employee, "Off");
  const friday = firstDay(4);
  await choose(employee, friday, "Custom");
  await day(employee, friday).getByLabel("From", { exact: true }).fill("17:00");
  await day(employee, friday).getByLabel("To", { exact: true }).fill("12:00");
  await day(employee, friday).getByLabel("To", { exact: true }).blur();
  await expect(day(employee, friday).getByText("The end time must be after the start time.")).toBeVisible();
  await employee.getByRole("button", { name: "Send my availability" }).click();
  await expect(employee.getByText(/^Sent!/)).toHaveCount(0);

  // A time off the quarter hour snaps to the nearest one when leaving the box. (The phone
  // emulator never fires "leave the box" after typing; there the red message covers it.)
  const from = day(employee, friday).getByLabel("From", { exact: true });
  if (testInfo.project.name === "desktop") {
    await from.focus();
    await from.fill("06:10");
    await from.blur();
    await expect(from).toHaveValue("06:15");
  } else {
    await from.fill("06:15");
  }
  await day(employee, friday).getByLabel("To", { exact: true }).fill("13:45");
  await day(employee, friday).getByLabel("To", { exact: true }).blur();
  await employee.getByRole("button", { name: "Send my availability" }).click();
  await expect(employee.getByText(/^Sent!/)).toBeVisible();
  await employee.reload();
  await expect(day(employee, friday).getByLabel("From", { exact: true })).toHaveValue("06:15");
  await expect(day(employee, friday).getByLabel("To", { exact: true })).toHaveValue("13:45");
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

  // On their week, those days show as time off and don't need a choice.
  await employee.goto("/employee/availability");
  await expect(employee.getByRole("listitem").filter({ hasText: nextWeekDay(1) }).getByText("Time off")).toBeVisible();
  await expect(employee.getByRole("group", { name: nextWeekDay(1) })).toHaveCount(0);

  await page.goto("/manager/availability?week=next");
  const row = page.getByRole("row", { name: /Eli Employee/ });
  await expect(row.getByRole("cell").nth(1)).toHaveText("Time off");
  await expect(row.getByRole("cell").nth(2)).toHaveText("Time off");
  await expect(page.getByRole("region", { name: "Upcoming time off" }).getByText("Family trip")).toBeVisible();

  await employee.goto("/employee/availability/time-off");
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
  // Monday 5 AM, this week: the coming week is past its deadline (unless it's Monday before 5 AM).
  await page.getByLabel("Every").selectOption("1");
  await page.getByLabel("at", { exact: true }).selectOption("05:00");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  // Saving again keeps the settings (regression: the form used to reset its checkboxes).
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Use an availability deadline")).toBeChecked();
  await expect(page.getByLabel("Every")).toHaveValue("1");

  await employee.goto("/employee/availability");
  await expect(employee.getByText(`The availability deadline for ${formatWeek(sendable().first)} has passed.`)).toBeVisible();
  await expect(employee.getByRole("button", { name: /^Send/ })).toHaveCount(0);
  await expect(employee.getByRole("radio")).toHaveCount(0);

  // The manager can still enter it for them, and it counts as sent.
  await page.goto("/manager/availability?week=next");
  await page.getByRole("link", { name: "Eli Employee" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Eli Employee's availability" })).toBeVisible();
  await expect(page.getByText(/deadline .* has passed/)).toHaveCount(0);
  await chooseAll(page, "All day");
  await page.getByRole("button", { name: "Save availability" }).click();
  await expect(page.getByText(`Saved Eli Employee's availability for ${formatWeek(sendable().first)}.`)).toBeVisible();

  await employee.reload();
  await expect(employee.getByRole("listitem").filter({ hasText: firstDay(0) }).getByText("All day")).toBeVisible();
  await employeeContext.close();
});

test("the owner starts available all day, every day", async ({ page, browser }, testInfo) => {
  const { employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  for (const week of ["this", "next", "after"]) {
    await page.goto(`/manager/availability?week=${week}`);
    const row = page.getByRole("row", { name: /Dana Owner/ });
    for (let i = 0; i < 7; i++) await expect(row.getByRole("cell").nth(i)).toHaveText("All day");
  }
  await employeeContext.close();
});
