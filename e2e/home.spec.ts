import { expect, test } from "@playwright/test";

test("home page shows the brand", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/TeamVory/);
  await expect(page.getByRole("img", { name: "TeamVory" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your team, perfectly organized." }),
  ).toBeVisible();
});
