import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { E2E_CRON_SECRET, EMAIL_FILE } from "./e2e/helpers";

mkdirSync(dirname(EMAIL_FILE), { recursive: true });

// The tests get their own database (DATABASE_URL + "_test"), created and migrated here,
// so test businesses never pile up in the data you use with `npm run dev`.
// (This file is also loaded by every test worker; only the main process prepares it.)
const TEST_DATABASE_URL = process.env.TEST_WORKER_INDEX
  ? process.env.E2E_DATABASE_URL!
  : (process.env.E2E_DATABASE_URL = execSync("node scripts/prepare-test-db.mjs", { encoding: "utf8" }));

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
    env: {
      // The tests sign up and send forms many times; don't let rate limits block them.
      CONTACT_MAX_PER_HOUR: "1000",
      RATE_LIMITS: "off",
      // Emails are written to a file the tests can read (see e2e/helpers.ts).
      EMAIL_CAPTURE_FILE: EMAIL_FILE,
      BETTER_AUTH_URL: "http://localhost:3100",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-not-used-anywhere-else-0000",
      CRON_SECRET: E2E_CRON_SECRET,
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
});
