import ExcelJS from "exceljs";
import { expect, type Page, test } from "@playwright/test";
import { formatDay } from "../lib/dates";
import { ownerWithEmployee, signUpOwner, uniqueEmail } from "./helpers";
import { applyPattern, next, setDefaultWeek, shiftLabel } from "./schedule-helpers";

async function addEvent(page: Page, title: string, date: string) {
  await page.goto("/manager/events");
  const form = page.getByRole("region", { name: "Add an event" });
  await form.getByLabel("Event", { exact: true }).fill(title);
  await form.getByLabel("Date").fill(date);
  await form.getByRole("combobox", { name: "Start" }).fill("6pm");
  await page.keyboard.press("Tab");
  await form.getByRole("combobox", { name: "End" }).fill("10pm");
  await page.keyboard.press("Tab");
  await form.getByLabel("Location (optional)").fill("Back patio");
  await form.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText(`${title} saved.`)).toBeVisible();
}

test("events show in planning and get a staffing shift", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  const saturday = next(5);
  await addEvent(page, "Private party", saturday);

  const event = page.getByRole("listitem", { name: "Private party" });
  await expect(event.getByText("Back patio")).toBeVisible();
  await expect(event.getByText("Needs extra staff: no shift added yet.")).toBeVisible();

  await page.goto("/manager");
  await expect(page.getByRole("region", { name: "Upcoming events" }).getByText("No shift added yet")).toBeVisible();

  await page.goto("/manager/events");
  await event.getByLabel("people", { exact: true }).selectOption("3");
  await event.getByRole("button", { name: "Add a shift for Private party" }).click();
  await expect(event.getByText("0 of 3 assigned: 3 more needed")).toBeVisible();

  // The number of people can change after it's added.
  await event.getByLabel("People needed: Private party").selectOption("2");
  await event.getByRole("button", { name: "Save" }).click();
  await expect(event.getByText("Saved: 2 people.")).toBeVisible();
  await expect(event.getByText("0 of 2 assigned: 2 more needed")).toBeVisible();

  // The shift shows on Shift setup (labelled) and on the Schedule, with the event under the day.
  await page.goto("/manager/shifts?week=next");
  const day = page.getByRole("listitem", { name: formatDay(saturday) });
  await expect(day.getByText("Private party · 6 PM – 10 PM")).toBeVisible();
  await expect(day.getByText("For Private party")).toBeVisible();
  await page.goto("/manager/schedule?week=next");
  const label = shiftLabel(5, "18:00", "22:00");
  await expect(page.getByText(`${label} needs 2 more`)).toBeVisible();
  await page.getByRole("button", { name: `Assign: ${label}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign Dana Owner" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The event says who is on it.
  await page.goto("/manager/events");
  await expect(event.getByText("1 of 2 assigned: 1 more needed")).toBeVisible();
  await expect(event.getByText("Dana Owner")).toBeVisible();
  await expect(event.getByRole("link", { name: "Change people on the Schedule →" })).toBeVisible();

  // Moving it to 7 PM moves its shift too.
  await page.getByRole("button", { name: "Edit: Private party" }).click();
  await event.getByLabel("Event", { exact: true }).fill("Birthday party");
  await event.getByRole("combobox", { name: "Start" }).fill("7pm");
  await page.keyboard.press("Tab");
  await event.getByRole("button", { name: "Save event" }).click();
  const renamed = page.getByRole("listitem", { name: "Birthday party" });
  await expect(renamed.getByText("Shift 7 PM – 10 PM · Dana Owner")).toBeVisible();

  // Deleting the event removes its shift and the people on it.
  page.once("dialog", (d) => {
    expect(d.message()).toContain("the 1 person on it come off the schedule");
    void d.accept();
  });
  await page.getByRole("button", { name: "Delete: Birthday party" }).click();
  await expect(page.getByText("No events coming up.")).toBeVisible();
  await page.goto("/manager/shifts?week=next");
  await expect(page.getByRole("listitem", { name: formatDay(saturday) }).getByRole("button", { name: /^Edit:/ })).toHaveCount(0);
});

test("the event form doesn't save on Enter, and the time box only takes times", async ({ page }, testInfo) => {
  await signUpOwner(page, uniqueEmail(testInfo, "owner"));
  await page.goto("/manager/events");
  const form = page.getByRole("region", { name: "Add an event" });
  await form.getByLabel("Event", { exact: true }).fill("Market");
  await form.getByLabel("Date").fill(next(2));
  await form.getByLabel("Date").press("Enter");
  // Enter moved on to the start time instead of saving.
  await expect(form.getByRole("combobox", { name: "Start" })).toBeFocused();
  await expect(page.getByText("Market saved.")).toHaveCount(0);

  // "2" becomes 2:00 PM when leaving the box; nothing can be typed after PM.
  await page.keyboard.type("2");
  await page.keyboard.press("Tab");
  await expect(form.getByRole("combobox", { name: "Start" })).toHaveValue("2:00 PM");
  await form.getByRole("combobox", { name: "Start" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type("22");
  await expect(form.getByRole("combobox", { name: "Start" })).toHaveValue("2:00 PM");
  await page.keyboard.press("Escape");

  // Saving without an end time explains what's missing.
  await form.getByRole("button", { name: "Add event" }).click();
  await expect(form.getByText("Choose a start and end time.")).toBeVisible();
  await form.getByRole("combobox", { name: "End" }).fill("5pm");
  await page.keyboard.press("Tab");
  await form.getByRole("button", { name: "Add event" }).click();
  await expect(page.getByText("Market saved.")).toBeVisible();
});

test("the schedule downloads as PDF, PNG, JPG, Word and Excel", async ({ page, browser }, testInfo) => {
  const { employee, employeeContext } = await ownerWithEmployee(page, browser, testInfo);
  await setDefaultWeek(employee, Array(7).fill("All day"));
  await applyPattern(page, "Standard", [0]);
  await page.goto("/manager/schedule?week=next");
  await page.getByRole("button", { name: `Assign: ${shiftLabel(0, "12:00", "17:00")}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Assign Eli Employee" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page.goto("/manager/reports");
  await page.getByRole("link", { name: /^Next week/ }).click();
  await expect(page.getByText("Draft, not published yet")).toBeVisible();
  const hours = page.getByRole("region", { name: "Hours this week" });
  await expect(hours.getByRole("row", { name: /Eli Employee/ })).toContainText("5");

  const magic: Record<string, number[]> = {
    pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
    png: [0x89, 0x50, 0x4e, 0x47],
    jpg: [0xff, 0xd8, 0xff],
    docx: [0x50, 0x4b], // zip
    xlsx: [0x50, 0x4b],
  };
  for (const label of ["PDF", "PNG image", "JPG image", "Word", "Excel"]) {
    const href = await page.getByRole("link", { name: new RegExp(`^${label}`) }).getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status(), label).toBe(200);
    const format = href!.split("/").pop()!.split("?")[0];
    expect(res.headers()["content-disposition"]).toContain(`teamvory-schedule-${next(0)}.${format}`);
    const body = await res.body();
    expect([...body.subarray(0, magic[format].length)], label).toEqual(magic[format]);
    if (format === "xlsx") {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(body as unknown as ArrayBuffer);
      const sheet = book.getWorksheet("Schedule")!;
      const text = sheet.getSheetValues().flat().join(" ");
      expect(text).toContain("Eli Employee");
      expect(text).toContain("2 needed"); // the evening shift is still empty
    }
  }

  // Employees can't download.
  const denied = await employee.request.get(`/api/exports/pdf?week=${next(0)}`, { maxRedirects: 0 });
  expect(denied.status()).toBeGreaterThanOrEqual(300);
  expect(denied.headers()["content-type"] ?? "").not.toContain("application/pdf");
  await employeeContext.close();
});
