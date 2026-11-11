import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { dayOfWeek, formatTime, nowInZone, WEEKDAYS } from "../lib/dates";
import { E2E_CRON_SECRET, EMAIL_FILE, ownerWithEmployee, waitForEmail } from "./helpers";
import { applyPattern, next, setDefaultWeek, shiftLabel } from "./schedule-helpers";

const ALL_DAY = Array(7).fill("All day") as "All day"[];

async function assign(page: Page, label: string, name: string) {
  await page.getByRole("button", { name: `Assign: ${label}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: `Assign ${name}` }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

async function publish(page: Page, buttonName: RegExp) {
  // Publishing with gaps asks first.
  const accept = (d: { accept: () => Promise<void> }) => void d.accept();
  page.on("dialog", accept);
  await page.getByRole("button", { name: buttonName }).click();
  page.off("dialog", accept);
}

async function emailsTo(to: string) {
  const lines = (await readFile(EMAIL_FILE, "utf8").catch(() => "")).split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l) as { to: string; subject: string; text: string }).filter((e) => e.to === to);
}

test("publish emails the team, and re-publishing only emails people whose shifts changed", async ({ page, browser }, testInfo) => {
  const { employee, employeeEmail, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ALL_DAY);
  await applyPattern(page, "Standard", [0]);
  const afternoon = shiftLabel(0, "12:00", "17:00");
  const evening = shiftLabel(0, "17:00", "21:00");

  // Before publishing the employee sees nothing.
  await employee.goto("/employee");
  await expect(employee.getByRole("region", { name: "Next week" }).getByText("Not published yet.")).toBeVisible();

  await page.goto("/manager/schedule?week=next");
  await expect(page.getByText("Draft · not published")).toBeVisible();
  await assign(page, afternoon, "Eli Employee");
  await publish(page, /^Publish & email team/);
  await expect(page.getByText("Published. Emailed 1 person.")).toBeVisible();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Publish/ })).toBeDisabled();

  const first = await waitForEmail(employeeEmail, /^Your schedule for/);
  expect(first.text).toContain(`• ${afternoon}`);

  await employee.reload();
  const nextWeek = employee.getByRole("region", { name: "Next week" });
  await expect(nextWeek.getByText(`${formatTime("12:00")} – ${formatTime("17:00")}`)).toBeVisible();
  await expect(nextWeek.getByText("Just you")).toBeVisible();

  // The owner adds himself: Eli's own shifts didn't change, so Eli gets no email.
  await assign(page, evening, "Dana Owner");
  await expect(page.getByText("Unpublished changes for 1 person")).toBeVisible();
  await publish(page, /^Publish changes/);
  await expect(page.getByText(/^Version 2 published\. No one else's shifts changed/)).toBeVisible();
  expect(await emailsTo(employeeEmail)).toHaveLength(2); // the invitation and the first publish

  // Rain: Eli comes off Monday. Only Eli is emailed, with what changed.
  await page.getByRole("button", { name: `Remove: Eli Employee, ${afternoon}` }).click();
  await publish(page, /^Publish changes/);
  await expect(page.getByText("Version 3 published. Emailed 1 person.")).toBeVisible();
  const changed = await waitForEmail(employeeEmail, /^Your schedule changed/);
  expect(changed.text).toContain(`− Removed: ${afternoon}`);

  await employee.reload();
  await expect(nextWeek.getByText("You're not on the schedule this week.")).toBeVisible();
  await employeeContext.close();
});

test("an availability change after publishing alerts the owner and shows on the dashboard", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext, ownerEmail } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ALL_DAY);
  await applyPattern(page, "Standard", [0]);
  const afternoon = shiftLabel(0, "12:00", "17:00");

  await page.goto("/manager/schedule?week=next");
  await assign(page, afternoon, "Eli Employee");
  await publish(page, /^Publish & email team/);
  await expect(page.getByText("Published. Emailed 1 person.")).toBeVisible();

  await employee.goto("/employee/availability/time-off");
  await employee.getByLabel("First day").fill(next(0));
  await employee.getByLabel("Last day").fill(next(0));
  await employee.getByRole("button", { name: "Add time off" }).click();
  await expect(employee.getByText("Time off added.")).toBeVisible();

  const alert = await waitForEmail(ownerEmail, /^Eli Employee can't work/);
  expect(alert.text).toContain(`• ${afternoon} (Time off)`);

  await page.goto("/manager");
  await expect(page.getByText(`can't work ${afternoon} any more (Time off)`)).toBeVisible();
  await expect(page.getByRole("region", { name: /^Next week/ }).getByText("Published")).toBeVisible();
  await employeeContext.close();
});

test("the daily job reminds people missing availability, once a day, and needs the secret", async ({ page, browser, request }, testInfo) => {
  const { employeeEmail, employeeContext } = await ownerWithEmployee(page, browser, testInfo);

  // Reminders start today, for 1 day.
  const today = nowInZone("America/New_York").date;
  await page.goto("/manager/settings");
  await page.getByLabel("Send availability reminders").check();
  await page.getByLabel("Starting").selectOption(String(dayOfWeek(today)));
  await page.getByLabel("for", { exact: true }).selectOption("1");
  await expect(page.getByText(`Sent each ${WEEKDAYS[dayOfWeek(today) - 1]} morning`)).toBeVisible();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  const auth = { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } };
  expect((await request.get("/api/cron/daily", auth)).ok()).toBe(true);
  const reminder = await waitForEmail(employeeEmail, /^Reminder: add your availability/);
  expect(reminder.text).toContain("/employee/availability");

  // Running again the same day sends nothing new.
  expect((await request.get("/api/cron/daily", auth)).ok()).toBe(true);
  expect((await emailsTo(employeeEmail)).filter((e) => e.subject.startsWith("Reminder"))).toHaveLength(1);
  await employeeContext.close();
});
