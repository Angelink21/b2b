import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT) || 3000;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      // Styleguide is gated in production; enable for e2e / local preview.
      ENABLE_STYLEGUIDE: "1",
      LEADS_SINKS: "console",
      // Skip min-fill anti-spam wait in automated browser tests.
      LEADS_MIN_FILL_MS: "0",
      // Parallel projects share one Node process IP hash.
      LEADS_RATE_LIMIT_MAX: "200",
      // Keep the production build away from the dev server's `.next`.
      NEXT_DIST_DIR: ".next-e2e",
      // Never hit Google Sheets during e2e — serve the build snapshot only.
      CATALOG_CSV_URL: "",
      CATALOG_STATUS_SECRET: "",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 12"], viewport: { width: 390, height: 844 } },
    },
  ],
});
