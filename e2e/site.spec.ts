import { expect, test } from "@playwright/test";

const pages = [
  { link: "How it works", path: "/how-it-works", heading: "How it works" },
  { link: "About", path: "/about", heading: "About us" },
  { link: "Contact", path: "/contact", heading: "Contact us" },
];

test("home page shows the main sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "How it works" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Everything your team needs" })).toBeVisible();
});

test("main menu reaches every page", async ({ page, isMobile }) => {
  await page.goto("/");
  for (const p of pages) {
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: p.link }).click();
    await expect(page).toHaveURL(p.path);
    await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
  }
});

test("footer links to Privacy and Terms", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await footer.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible();
  await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Terms of Service" })).toBeVisible();
});

test("Get started opens sign-up", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("banner").getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create your business" })).toBeVisible();
});

test("unknown pages show a friendly 404", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
});

test.describe("contact form", () => {
  test("shows errors for missing fields and keeps what was typed", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Your name").fill("Ana");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Please check the highlighted fields." })).toBeVisible();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Please write at least 10 characters.")).toBeVisible();
    await expect(page.getByLabel("Your name")).toHaveValue("Ana");
  });

  test("sends a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Your name").fill("Playwright Test");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Message").fill("Hello from the automated browser test.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks, your message was sent.");
  });
});
