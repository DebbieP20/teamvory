import { expect, type Page, test } from "@playwright/test";
import { ownerWithEmployee } from "./helpers";
import { applyPattern, next, setDefaultWeek } from "./schedule-helpers";

// Every page fits a small phone (360 px wide) without sideways scrolling.
// With SHOTS=1 it also saves a full-page screenshot of each, for a visual review.

const SCREEN = 360;
test.use({ viewport: { width: SCREEN, height: 740 }, isMobile: true, hasTouch: true });

async function fits(page: Page, path: string, problems: string[]) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // Anything sticking out past the right edge (outside its own scroll box) counts. Compared
  // with the real screen width: a phone browser zooms out to fit a too-wide page, so the
  // page's own idea of its width can't be trusted.
  const sticking = await page.evaluate((width) => {
    const scrolls = (el: Element) => ["auto", "scroll"].includes(getComputedStyle(el).overflowX);
    const out: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= width + 1 || el.closest(".sr-only")) continue;
      let p = el.parentElement;
      let inScrollBox = false;
      while (p && p !== document.body) {
        if (scrolls(p)) inScrollBox = true;
        p = p.parentElement;
      }
      if (!inScrollBox) out.push(`<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 40)}" ends at ${Math.round(r.right)}px`);
    }
    return { width, out: out.slice(0, 3) };
  }, SCREEN);
  for (const o of sticking.out) problems.push(`${path}: ${o} (screen ${sticking.width}px)`);
  if (process.env.SHOTS) {
    await page.screenshot({ path: `test-results/phone/${path.replace(/[/?=]/g, "_") || "home"}.png`, fullPage: true });
  }
}

test("public pages fit a small phone", async ({ page }) => {
  test.skip(test.info().project.name !== "phone", "one run is enough");
  const problems: string[] = [];
  for (const path of ["/", "/how-it-works", "/about", "/contact", "/privacy", "/terms", "/login", "/signup", "/forgot-password"]) {
    await fits(page, path, problems);
  }
  expect(problems).toEqual([]);
});

test("every manager and employee page fits a small phone", async ({ page, browser }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "one run is enough");
  test.setTimeout(120_000);
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo, "Eleanor Longname-Employee");
  await setDefaultWeek(employee, Array(7).fill("All day"));
  await applyPattern(page, "Standard", [0, 1, 2, 3, 4, 5, 6]);

  // A real-looking week: built, published, with an event and an open shift.
  await page.goto("/manager/events");
  const form = page.getByRole("region", { name: "Add an event" });
  await form.getByLabel("Event", { exact: true }).fill("Private birthday party on the patio");
  await form.getByLabel("Date").fill(next(5));
  await form.getByRole("combobox", { name: "Start" }).fill("6pm");
  await page.keyboard.press("Tab");
  await form.getByRole("combobox", { name: "End" }).fill("10pm");
  await page.keyboard.press("Tab");
  await form.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText(/saved\.$/)).toBeVisible();
  await page.getByRole("button", { name: /^Add a shift for/ }).click();
  await expect(page.getByText(/assigned:/).first()).toBeVisible();

  await page.goto("/manager/schedule?week=next");
  await page.getByRole("button", { name: "Build schedule" }).click();
  await expect(page.getByText(/^Schedule built/)).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: /^Publish/ }).click();
  await expect(page.getByText(/^Published\./)).toBeVisible();

  await employee.goto("/employee");
  const shiftLink = employee.getByRole("link", { name: /^Can't make it/ }).first();
  const shiftHref = (await shiftLink.getAttribute("href"))!;
  await shiftLink.click();
  await employee.getByRole("button", { name: "Post as open shift" }).click();
  await expect(employee.getByText(/^Posted as an open shift/)).toBeVisible();

  const problems: string[] = [];
  for (const path of [
    "/manager",
    "/manager/employees",
    "/manager/availability",
    "/manager/availability?week=next",
    "/manager/shifts?week=next",
    "/manager/shifts/patterns",
    "/manager/schedule?week=next",
    "/manager/events",
    "/manager/reports",
    "/manager/settings",
  ]) {
    await fits(page, path, problems);
  }
  for (const path of [
    "/employee",
    "/employee/shifts",
    shiftHref,
    "/employee/availability",
    "/employee/availability/week?week=next",
    "/employee/availability/time-off",
  ]) {
    await fits(employee, path, problems);
  }
  expect(problems).toEqual([]);
  await employeeContext.close();
});
