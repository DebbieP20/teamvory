import { mkdir } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import sharp from "sharp";
import { inviteEmployee, logIn, signUpOwner, uniqueEmail } from "./helpers";
import { applyPattern, type DayChoice, next, sendWeek } from "./schedule-helpers";

// Screenshots of a made-up café for the home page (public/screenshots).
// `npm run build`, then `npm run screenshots`. Skipped in the normal test run.

const OUT = "public/screenshots";
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
test.use({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });

// Regular weeks with days off, whole days and custom hours (still enough people for every shift).
const A: DayChoice = "All day";
const O: DayChoice = "Off";
const team: [string, DayChoice[]][] = [
  ["Ana López", [O, O, A, ["12:00", "17:00"], A, A, ["17:00", "21:00"]]],
  ["Ben Carter", [["09:00", "17:00"], ["09:00", "17:00"], A, A, ["09:00", "17:00"], O, O]],
  ["Chloe Kim", [A, ["17:00", "21:00"], O, A, ["14:00", "20:00"], A, A]],
  ["Diego Ramos", [A, A, ["12:00", "17:00"], O, A, ["16:00", "22:00"], A]],
  ["Emma Wilson", [O, A, A, ["17:00", "21:00"], A, A, ["12:00", "17:00"]]],
  ["Farah Ali", [["17:00", "21:00"], A, ["17:00", "21:00"], A, O, A, A]],
  ["Jamal Brooks", [A, O, A, A, ["12:00", "17:00"], A, ["09:00", "17:00"]]],
];

/** The visible screen, or (fit) just down to the end of the page's content. */
async function shot(page: Page, name: string, { fit = false } = {}) {
  await page.waitForLoadState("networkidle");
  await page.mouse.move(0, 0);
  const size = page.viewportSize()!;
  const bottom = fit ? await page.evaluate(() => Math.ceil(document.querySelector("main")!.lastElementChild!.getBoundingClientRect().bottom) + 40) : size.height;
  const png = await page.screenshot({ animations: "disabled", caret: "hide", clip: { x: 0, y: 0, width: size.width, height: Math.min(bottom, size.height) } });
  await sharp(png).webp({ quality: 82 }).toFile(`${OUT}/${name}.webp`);
}

test("home page screenshots", async ({ page, browser }, testInfo) => {
  test.skip(!process.env.SCREENSHOTS || testInfo.project.name !== "desktop", "run with npm run screenshots");
  test.setTimeout(300_000);
  await mkdir(OUT, { recursive: true });

  // The café, its team and their regular weeks.
  await signUpOwner(page, uniqueEmail(testInfo, "maya"), "Maya Torres", "Harbor Lane Café");
  const people = [];
  for (const [name, week] of team) {
    const person = await inviteEmployee(page, browser, testInfo, name, name.split(" ")[0].toLowerCase());
    await sendWeek(person.employee, week);
    people.push(person);
  }

  // This week and next: a quiet Monday, a party next Saturday, built and published.
  for (const week of ["this", "next"] as const) {
    await applyPattern(page, "Slow day", [0], week);
    await applyPattern(page, "Standard", [1, 2, 3, 4, 5, 6], week);
  }
  await page.goto("/manager/events");
  const form = page.getByRole("region", { name: "Add an event" });
  await form.getByLabel("Event", { exact: true }).fill("Birthday party");
  await form.getByLabel("Date").fill(next(5));
  await form.getByLabel("Start", { exact: true }).fill("18:00");
  await page.keyboard.press("Tab");
  await form.getByLabel("End", { exact: true }).fill("22:00");
  await page.keyboard.press("Tab");
  await form.getByLabel("Location (optional)").fill("Patio");
  await form.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText(/saved\.$/)).toBeVisible();
  await page.getByRole("button", { name: /^Add a shift for/ }).click();
  await expect(page.getByText(/assigned:/).first()).toBeVisible();

  for (const week of ["this", "next"]) {
    await page.goto(`/manager/schedule?week=${week}`);
    await page.getByRole("button", { name: "Build schedule" }).click();
    await expect(page.getByText(/^Schedule built/)).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /^Publish/ }).click();
    await expect(page.getByText(/^Published\./)).toBeVisible();
  }

  // Next week: Diego can't make a shift and offers it to the team. Whoever can take it is the
  // one shown on the phone, with a coworker asking them to swap too.
  const staff = people.map((p, i) => ({ ...p, name: team[i][0] }));
  const nextWeekShifts = async (p: Page) => {
    await p.goto("/employee");
    const links = p.getByRole("region", { name: "Next week" }).getByRole("link", { name: /^Can't make it/ });
    await expect(links.first()).toBeVisible();
    return links.evaluateAll((all) => all.map((l) => l.getAttribute("href")!));
  };
  const diego = staff.find((p) => p.name.startsWith("Diego"))!;
  await diego.employee.goto((await nextWeekShifts(diego.employee))[0]);
  await diego.employee.getByRole("button", { name: "Post as open shift" }).click();
  await expect(diego.employee.getByText(/^Posted as an open shift/)).toBeVisible();

  let viewer;
  for (const p of staff.filter((p) => p !== diego)) {
    await p.employee.goto("/employee/shifts");
    const pickUp = p.employee.getByRole("button", { name: /^Pick up/ });
    await expect(pickUp.or(p.employee.getByText("No open shifts you can work right now."))).toBeVisible();
    if (await pickUp.count()) {
      viewer = p;
      break;
    }
  }
  if (!viewer) throw new Error("Nobody can pick up Diego's shift");
  const firstName = viewer.name.split(" ")[0];
  let asked = false;
  for (const p of staff.filter((p) => p !== diego && p !== viewer)) {
    for (const href of await nextWeekShifts(p.employee)) {
      await p.employee.goto(href);
      await expect(p.employee.getByText("Swap for").or(p.employee.getByText(/^No coworker shift works/))).toBeVisible();
      const withViewer = p.employee.getByRole("radio", { name: new RegExp(firstName) });
      if (!(await withViewer.count())) continue;
      await withViewer.first().check();
      await p.employee.getByRole("button", { name: "Ask to swap" }).click();
      await expect(p.employee.getByText(new RegExp(`^You asked ${firstName}`))).toBeVisible();
      asked = true;
      break;
    }
    if (asked) break;
  }
  expect(asked, `someone can swap with ${firstName}`).toBe(true);

  // Emma asks for a long weekend later in the month, and Maya approves time off herself.
  await page.goto("/manager/settings");
  await page.getByLabel("Managers approve time off").check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  const emma = staff.find((p) => p.name.startsWith("Emma"))!.employee;
  await emma.goto("/employee/availability/time-off");
  await emma.getByLabel("First day").fill(next(11));
  await emma.getByLabel("Last day").fill(next(13));
  await emma.getByLabel("Note (optional)").fill("Family trip");
  await emma.getByRole("button", { name: "Add time off" }).click();
  await expect(emma.getByText("Time off requested.")).toBeVisible();

  // The owner's view, on a laptop.
  await page.goto("/manager/availability?week=next");
  await shot(page, "availability", { fit: true });
  await page.goto("/manager/schedule?week=next");
  await shot(page, "schedule");
  await page.goto("/manager");
  await shot(page, "dashboard", { fit: true });
  await page.goto(`/manager/reports?week=${next(0)}`);
  await shot(page, "reports");
  const image = await page.request.get(`/api/exports/png?week=${next(0)}`);
  expect(image.ok()).toBe(true);
  await sharp(await image.body()).webp({ quality: 82 }).toFile(`${OUT}/export.webp`);

  // An employee's view, on a phone.
  const phoneContext = await browser.newContext(PHONE);
  const phone = await phoneContext.newPage();
  await logIn(phone, viewer.employeeEmail);
  await expect(phone).toHaveURL("/employee");
  await shot(phone, "phone-schedule");
  await phone.goto("/employee/shifts");
  await shot(phone, "phone-shifts");
  // Ana's regular week starts with two days off.
  await phone.getByRole("button", { name: "Log out" }).click();
  await logIn(phone, staff[0].employeeEmail);
  await expect(phone).toHaveURL("/employee");
  await phone.goto("/employee/availability");
  await shot(phone, "phone-availability");

  await phoneContext.close();
  for (const p of people) await p.employeeContext.close();
});
