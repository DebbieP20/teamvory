import { expect, test } from "@playwright/test";
import { PASSWORD, field, linkIn, logIn, logOut, signUpOwner, uniqueEmail, waitForEmail } from "./helpers";

test("owner signs up, logs out and logs back in", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo, "owner");
  await signUpOwner(page, email);
  await expect(page.getByRole("main").getByText("Dana's Café")).toBeVisible();

  await logOut(page);
  await logIn(page, email);
  await expect(page).toHaveURL("/manager");
});

test("sign-up rejects an email that's already used", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo, "dupe");
  await signUpOwner(page, email);
  await logOut(page);

  await page.goto("/signup");
  await field(page, "Your name").fill("Someone Else");
  await field(page, "Business name").fill("Other Shop");
  await field(page, "Email").fill(email);
  await field(page, "Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create business" }).click();
  await expect(page.getByText("An account with this email already exists.")).toBeVisible();
});

test("wrong password shows a general error", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo, "wrongpw");
  await signUpOwner(page, email);
  await logOut(page);

  await logIn(page, email, "not the password");
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
});

test("signed-out visitors are sent to log in", async ({ page }) => {
  await page.goto("/manager");
  await expect(page).toHaveURL("/login");
  await page.goto("/employee");
  await expect(page).toHaveURL("/login");
});

test("password reset by email", async ({ page }, testInfo) => {
  const email = uniqueEmail(testInfo, "reset");
  await signUpOwner(page, email);
  await logOut(page);

  await page.getByRole("link", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
  await field(page, "Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If there's an account for that email")).toBeVisible();

  const resetEmail = await waitForEmail(email, /Reset your TeamVory password/);
  await page.goto(linkIn(resetEmail));
  const newPassword = "a brand new passphrase";
  await field(page, "New password").fill(newPassword);
  await field(page, "Type it again").fill(newPassword);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your password was changed.")).toBeVisible();

  await logIn(page, email, PASSWORD);
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
  await logIn(page, email, newPassword);
  await expect(page).toHaveURL("/manager");

  // The link only works once.
  await page.goto(linkIn(resetEmail));
  await field(page, "New password").fill("yet another passphrase");
  await field(page, "Type it again").fill("yet another passphrase");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("This reset link is invalid or has expired.")).toBeVisible();
});

test("owner invites an employee, who joins, and can be set inactive", async ({ page, browser }, testInfo) => {
  const ownerEmail = uniqueEmail(testInfo, "owner");
  const employeeEmail = uniqueEmail(testInfo, "employee");
  await signUpOwner(page, ownerEmail);

  await page.getByRole("link", { name: "Employees" }).first().click();
  await field(page, "Email").fill(employeeEmail);
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${employeeEmail}.`)).toBeVisible();
  await expect(page.getByRole("region", { name: "Invited" }).getByText(employeeEmail)).toBeVisible();

  // The employee opens the link in their own browser.
  const invite = await waitForEmail(employeeEmail, /invited you to Dana's Café/);
  const employeeContext = await browser.newContext();
  const employee = await employeeContext.newPage();
  await employee.goto(linkIn(invite));
  await expect(employee.getByRole("heading", { name: "Join Dana's Café" })).toBeVisible();
  await field(employee, "Your name").fill("Eli Employee");
  await field(employee, "Choose a password").fill(PASSWORD);
  await employee.getByRole("button", { name: "Create account and join" }).click();
  await expect(employee).toHaveURL("/employee");
  await expect(employee.getByRole("heading", { level: 1, name: "Hi, Eli" })).toBeVisible();

  // Employees can't open the manager area.
  await employee.goto("/manager/employees");
  await expect(employee).toHaveURL("/employee");

  // The invitation can't be used twice.
  await employee.goto(linkIn(invite));
  await expect(employee.getByRole("heading", { name: "This invitation was already used" })).toBeVisible();

  // The owner sees them on the team and sets them inactive.
  await page.reload();
  const team = page.getByRole("region", { name: "Your team" });
  await expect(team.getByText("Eli Employee")).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await team.getByRole("button", { name: "Set inactive: Eli Employee" }).click();
  await expect(team.getByText("Inactive", { exact: true })).toBeVisible();

  await employee.goto("/employee");
  await expect(employee).toHaveURL("/inactive");
  await expect(employee.getByRole("heading", { name: "Your account is inactive" })).toBeVisible();

  // Turned back on, they're in again.
  await team.getByRole("button", { name: "Set active: Eli Employee" }).click();
  await expect(team.getByText("Inactive", { exact: true })).toBeHidden();
  await employee.goto("/employee");
  await expect(employee).toHaveURL("/employee");
  await employeeContext.close();
});

test("owner invites a manager, who can manage employees but not other managers", async ({ page, browser }, testInfo) => {
  const ownerEmail = uniqueEmail(testInfo, "owner");
  const managerEmail = uniqueEmail(testInfo, "manager");
  await signUpOwner(page, ownerEmail);
  await page.goto("/manager/employees");
  await field(page, "Email").fill(managerEmail);
  await field(page, "Role").selectOption("MANAGER");
  await page.getByRole("button", { name: "Send invitation" }).click();
  await expect(page.getByText(`Invitation sent to ${managerEmail}.`)).toBeVisible();

  const invite = await waitForEmail(managerEmail, /invited you/);
  const managerContext = await browser.newContext();
  const manager = await managerContext.newPage();
  await manager.goto(linkIn(invite));
  await field(manager, "Your name").fill("Max Manager");
  await field(manager, "Choose a password").fill(PASSWORD);
  await manager.getByRole("button", { name: "Create account and join" }).click();
  await expect(manager).toHaveURL("/manager");

  // Managers can invite employees, but don't get the role choice.
  await manager.goto("/manager/employees");
  await expect(field(manager, "Role")).toHaveCount(0);
  // ...and get no buttons for the owner.
  const ownerRow = manager.getByRole("listitem").filter({ hasText: "Dana Owner" });
  await expect(ownerRow.getByRole("button")).toHaveCount(0);
  await managerContext.close();
});
