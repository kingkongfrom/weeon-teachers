import { defineConfig, devices } from "@playwright/test";

// Teacher web E2E journeys (docs/testing.md §7 — QA-6).
//
// Auth-backed journeys run only when E2E credentials are provided, so a plain
// `npm run test:e2e` (and CI without a preview stack) still passes: the
// credential-gated specs skip themselves. See tests/e2e/README.md.
const PORT = 3300;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: process.env.CI ? 1 : 0,
  fullyParallel: false,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run dev -- -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
      },
});
