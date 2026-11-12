import { expect, test } from "@playwright/test";
import { formatDay } from "../lib/dates";
import { ownerWithEmployee, signUpOwner, uniqueEmail } from "./helpers";
import { applyPattern, next, setDefaultWeek, shiftLabel, weeks } from "./schedule-helpers";

test("new businesses start with Standard and Slow day patterns, which set up days", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  await applyPattern(page, "Standard", [0, 1]);
  const monday = page.getByRole("listitem", { name: formatDay(next(0)) });
  await expect(monday.getByText("18 h")).toBeVisible(); // 5 h × 2 + 4 h × 2
  await expect(page.getByText("Staff hours needed: 36 h")).toBeVisible();

  // Rain on Tuesday: Slow day replaces only that day.
  await applyPattern(page, "Slow day", [1]);
  await expect(page.getByRole("listitem", { name: formatDay(next(1)) }).getByText("9 h")).toBeVisible();
  await expect(monday.getByText("18 h")).toBeVisible();
});

test("add, edit and remove a single shift", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  await page.goto("/manager/shifts?week=next");
  const wednesday = page.getByRole("listitem", { name: formatDay(next(2)) });
  await wednesday.getByRole("button", { name: /^Add shift/ }).click();
  await wednesday.getByRole("combobox", { name: "Start" }).fill("6pm");
  await page.keyboard.press("Tab");
  await wednesday.getByRole("combobox", { name: "End" }).fill("10pm");
  await page.keyboard.press("Tab");
  await wednesday.getByLabel("people", { exact: true }).selectOption("3");
  await wednesday.getByRole("button", { name: "Add", exact: true }).click();
  await expect(wednesday.getByText("12 h")).toBeVisible(); // 4 h × 3
  await expect(wednesday.getByText("6 PM – 10 PM")).toBeVisible();

  await wednesday.getByRole("button", { name: "Edit: 6 PM – 10 PM" }).click();
  await wednesday.getByLabel("people", { exact: true }).selectOption("2");
  await wednesday.getByRole("button", { name: "Save" }).click();
  await expect(wednesday.getByText("8 h")).toBeVisible();

  await wednesday.getByRole("button", { name: "Edit: 6 PM – 10 PM" }).click();
  page.once("dialog", (d) => d.accept());
  await wednesday.getByRole("button", { name: "Remove shift" }).click();
  await expect(wednesday.getByText("No shifts")).toBeVisible();
});

test("copy last week's shifts into next week", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  await page.goto("/manager/shifts?week=this");
  await page.getByLabel("Pattern").selectOption({ index: 0 });
  await page.getByRole("checkbox", { name: formatDay(weeks().thisWeek) }).check();
  await page.getByRole("button", { name: "Apply to ticked days" }).click();
  await expect(page.getByText(/applied to 1 day/)).toBeVisible();

  await page.goto("/manager/shifts?week=next");
  await page.getByRole("button", { name: "Copy last week" }).click();
  await expect(page.getByText(/Copied 2 shifts from last week/)).toBeVisible();
  await expect(page.getByRole("listitem", { name: formatDay(next(0)) }).getByRole("button", { name: /^Edit:/ })).toHaveCount(2);
});

test("create and delete a pattern", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  await page.goto("/manager/shifts/patterns");
  const form = page.getByRole("region", { name: "New pattern" });
  await form.getByLabel("Pattern name").fill("Event night");
  await form.getByRole("combobox", { name: "Start" }).fill("6pm");
  await page.keyboard.press("Tab");
  await form.getByRole("combobox", { name: "End" }).fill("10:30pm");
  await page.keyboard.press("Tab");
  await form.getByLabel("people", { exact: true }).selectOption("3");
  await form.getByRole("button", { name: "Create pattern" }).click();
  await expect(page.getByRole("region", { name: "Event night" })).toBeVisible();

  await page.goto("/manager/shifts?week=next");
  await expect(page.getByLabel("Pattern").getByRole("option", { name: /Event night \(6 PM–10:30 PM ×3\)/ })).toHaveCount(1);

  await page.goto("/manager/shifts/patterns");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete: Event night" }).click();
  await expect(page.getByRole("region", { name: "Event night" })).toHaveCount(0);
});

test("assign people by hand, with hour totals, pins and removal", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ["All day", "All day", "All day", "All day", "All day", "Off", "Off"]);
  await applyPattern(page, "Standard", [0]);

  await page.goto("/manager/schedule?week=next");
  const afternoon = shiftLabel(0, "12:00", "17:00");
  await expect(page.getByText(`${afternoon} needs 2 more`)).toBeVisible();

  await page.getByRole("button", { name: `Assign: ${afternoon}` }).click();
  const dialog = page.getByRole("dialog");
  // Employees first, the owner last as backup.
  await expect(dialog.getByRole("button").filter({ hasText: /h fair share|h · backup/ }).first()).toContainText("Eli Employee");
  await dialog.getByRole("button", { name: "Assign Eli Employee" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(`${afternoon} needs 1 more`)).toBeVisible();

  await page.getByRole("button", { name: `Assign: ${afternoon}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign Dana Owner" }).click();
  await expect(page.getByText(`${afternoon} needs`)).toHaveCount(0);

  const hours = page.getByRole("complementary");
  await expect(hours.getByRole("listitem").filter({ hasText: "Eli Employee" })).toContainText("5 h · 1 shift");

  // Placed by hand → pinned, so Build and Regenerate keep it. Unpinning lets them change it.
  await expect(page.getByRole("button", { name: `Unpin: Eli Employee, ${afternoon}` })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: `Unpin: Eli Employee, ${afternoon}` }).click();
  await expect(page.getByRole("button", { name: `Pin: Eli Employee, ${afternoon}` })).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: `Remove: Eli Employee, ${afternoon}` }).click();
  await expect(page.getByText(`${afternoon} needs 1 more`)).toBeVisible();
  await expect(hours.getByRole("listitem").filter({ hasText: "Eli Employee" })).toContainText("0 h · 0 shifts");
  await employeeContext.close();
});

test("someone marked not available needs a 'we agreed' confirmation", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ["All day", "Off", "All day", "All day", "All day", "Off", "Off"]);
  await applyPattern(page, "Standard", [1]);

  await page.goto("/manager/schedule?week=next");
  const evening = shiftLabel(1, "17:00", "21:00");
  await page.getByRole("button", { name: `Assign: ${evening}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Eli Employee: Not available that day" }).click();
  await expect(dialog.getByText("Only add them if you've talked and agreed.")).toBeVisible();
  await dialog.getByRole("button", { name: "We agreed, assign" }).click();

  const cell = page.getByRole("button", { name: `Unpin: Eli Employee, ${evening}` }); // agreed exceptions are pinned
  await expect(cell).toBeVisible();
  const chip = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: `Unpin: Eli Employee, ${evening}` }) });
  await expect(chip.getByText("agreed", { exact: true })).toBeVisible();
  await employeeContext.close();
});

test("overlapping shifts are blocked, and later availability changes are flagged", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ["All day", "All day", "All day", "All day", "All day", "All day", "All day"]);
  await applyPattern(page, "Standard", [0]);

  // An extra 4–8 PM shift on Monday overlaps both standard shifts.
  const monday = page.getByRole("listitem", { name: formatDay(next(0)) });
  await monday.getByRole("button", { name: /^Add shift/ }).click();
  await monday.getByRole("combobox", { name: "Start" }).fill("4pm");
  await page.keyboard.press("Tab");
  await monday.getByRole("combobox", { name: "End" }).fill("8pm");
  await page.keyboard.press("Tab");
  await monday.getByRole("button", { name: "Add", exact: true }).click();
  await expect(monday.getByRole("button", { name: /^Edit:/ })).toHaveCount(3);

  await page.goto("/manager/schedule?week=next");
  const afternoon = shiftLabel(0, "12:00", "17:00");
  await page.getByRole("button", { name: `Assign: ${afternoon}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign Eli Employee" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.getByRole("button", { name: `Assign: ${shiftLabel(0, "16:00", "20:00")}` }).click();
  await expect(page.getByRole("dialog").getByText(`Already working ${afternoon}`)).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();

  // Eli then takes Monday off: the schedule warns instead of changing by itself.
  await employee.goto("/employee/availability/time-off");
  await employee.getByLabel("First day").fill(next(0));
  await employee.getByLabel("Last day").fill(next(0));
  await employee.getByRole("button", { name: "Add time off" }).click();
  await expect(employee.getByText("Time off added.")).toBeVisible();

  await page.reload();
  await expect(page.getByText(`Eli Employee is on ${afternoon} but isn't available any more (Time off).`)).toBeVisible();
  await employeeContext.close();
});

test("lowering the people needed after assigning flags the extra person", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, ["All day", "All day", "All day", "All day", "All day", "All day", "All day"]);
  await applyPattern(page, "Standard", [1]);
  const evening = shiftLabel(1, "17:00", "21:00");

  await page.goto("/manager/schedule?week=next");
  for (const name of ["Eli Employee", "Dana Owner"]) {
    await page.getByRole("button", { name: `Assign: ${evening}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: `Assign ${name}` }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  // Full: no more Assign button.
  await expect(page.getByRole("button", { name: `Assign: ${evening}` })).toHaveCount(0);

  // The owner changes Tuesday 5–9 to 1 person.
  await page.goto("/manager/shifts?week=next");
  const tuesday = page.getByRole("listitem", { name: formatDay(next(1)) });
  await tuesday.getByRole("button", { name: "Edit: 5 PM – 9 PM" }).click();
  await tuesday.getByLabel("people", { exact: true }).selectOption("1");
  await tuesday.getByRole("button", { name: "Save" }).click();
  await expect(tuesday.getByText("2 assigned: remove 1 on the")).toBeVisible();

  await page.goto("/manager/schedule?week=next");
  await expect(page.getByText(`${evening} has 2 people but needs 1. Remove 1`)).toBeVisible();
  await expect(page.getByText("Every shift is filled.")).toHaveCount(0);

  await page.getByRole("button", { name: `Remove: Dana Owner, ${evening}` }).click();
  await expect(page.getByText(`${evening} has 2 people`)).toHaveCount(0);
  await employeeContext.close();
});
