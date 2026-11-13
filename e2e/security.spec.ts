import { expect, test } from "@playwright/test";
import { ownerWithEmployee, signUpOwner, uniqueEmail } from "./helpers";

test("every page sends the security headers", async ({ request }) => {
  for (const path of ["/", "/login", "/api/health"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["content-security-policy"], path).toContain("frame-ancestors 'none'");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});

test("logged-out visitors are sent to log in", async ({ page }) => {
  for (const path of ["/manager", "/manager/schedule", "/manager/reports", "/employee", "/employee/shifts"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/login/);
  }
  const download = await page.request.get("/api/exports/pdf?week=2026-11-16", { maxRedirects: 0 });
  expect(download.headers()["content-type"] ?? "").not.toContain("application/pdf");
});

test("employees can't open manager pages", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  for (const path of ["/manager", "/manager/employees", "/manager/schedule", "/manager/settings", "/manager/reports"]) {
    await employee.goto(path);
    await expect(employee, path).toHaveURL("/employee");
  }
  await employeeContext.close();
});

test("one business can't see another business's people", async ({ page, browser }, testInfo) => {
  // Business A with an employee.
  await ownerWithEmployee(page, browser, testInfo);
  await page.goto("/manager/availability");
  const href = await page.getByRole("link", { name: "Eli Employee" }).getAttribute("href");

  // Business B's owner tries A's employee's page directly.
  const other = await browser.newContext();
  const intruder = await other.newPage();
  await signUpOwner(intruder, uniqueEmail(testInfo, "intruder"), "Ivy Intruder", "Other Shop");
  // (The page streams, so the status is already sent; what matters is what's shown.)
  await intruder.goto(href!);
  await expect(intruder.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(intruder.getByText("Eli Employee")).toHaveCount(0);
  await other.close();
});
