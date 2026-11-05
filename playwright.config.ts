import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build (`npm run build` first), on
// port 3100 so they never clash with `npm run dev` on port 3000.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    // The tests send the contact form many times; don't let the rate limit block them.
    env: { CONTACT_MAX_PER_HOUR: "1000" },
  },
});
