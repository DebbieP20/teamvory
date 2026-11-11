import { readFile } from "node:fs/promises";
import { type Browser, expect, type Page, type TestInfo } from "@playwright/test";

export const EMAIL_FILE = ".playwright/emails.jsonl";

/** A unique email address per test and browser project. */
export function uniqueEmail(testInfo: TestInfo, label: string) {
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${label}-${testInfo.project.name}-${id}@example.com`;
}

type CapturedEmail = { to: string; subject: string; text: string };

/** Waits for an email to `to` (the app writes emails to EMAIL_FILE during tests). */
export async function waitForEmail(to: string, subject: RegExp): Promise<CapturedEmail> {
  let found: CapturedEmail | undefined;
  await expect
    .poll(
      async () => {
        const lines = (await readFile(EMAIL_FILE, "utf8").catch(() => "")).split("\n").filter(Boolean);
        const emails = lines.map((l) => JSON.parse(l) as CapturedEmail);
        found = emails.reverse().find((e) => e.to === to && subject.test(e.subject));
        return !!found;
      },
      { timeout: 10_000, message: `email to ${to} matching ${subject}` },
    )
    .toBe(true);
  return found!;
}

export function linkIn(email: CapturedEmail): string {
  const match = email.text.match(/https?:\/\/\S+/);
  if (!match) throw new Error(`No link in email: ${email.subject}`);
  return match[0];
}

export const PASSWORD = "correct horse battery";

/**
 * A visible form field by its label. Next.js keeps recently visited pages
 * mounted but hidden, so the same label can exist on a hidden page too.
 */
export function field(page: Page, label: string) {
  return page.getByLabel(label, { exact: true }).filter({ visible: true });
}

/** Creates a business through the sign-up page and waits for the dashboard. */
export async function signUpOwner(page: Page, email: string, name = "Dana Owner", business = "Dana's Café") {
  await page.goto("/signup");
  await field(page, "Your name").fill(name);
  await field(page, "Business name").fill(business);
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page).toHaveURL("/manager");
  await expect(page.getByRole("heading", { level: 1, name: `Welcome, ${name.split(" ")[0]}` })).toBeVisible();
}

export async function logIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function logOut(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL("/login");
}

/** Owner signs up and invites an employee, who joins in a separate browser. */
export async function ownerWithEmployee(page: Page, browser: Browser, testInfo: TestInfo, employeeName = "Eli Employee") {
  const ownerEmail = uniqueEmail(testInfo, "owner");
  const employeeEmail = uniqueEmail(testInfo, "employee");
  await signUpOwner(page, ownerEmail);
  await page.goto("/manager/employees");
  await field(page, "Email").fill(employeeEmail);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${employeeEmail}.`)).toBeVisible();

  const invite = await waitForEmail(employeeEmail, /invited you/);
  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await employee.goto(linkIn(invite));
  await field(employee, "Your name").fill(employeeName);
  await field(employee, "Choose a password").fill(PASSWORD);
  await employee.getByRole("button", { name: "Create account and join" }).click();
  await expect(employee).toHaveURL("/employee");
  return { employee, employeeEmail, employeeContext };
}
