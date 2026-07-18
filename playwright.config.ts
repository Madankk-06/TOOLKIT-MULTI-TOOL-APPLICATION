import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:    "./e2e",
  fullyParallel: true,
  retries:    process.env.CI ? 2 : 0,
  workers:    process.env.CI ? 1 : undefined,
  reporter:   "html",

  use: {
    baseURL:          "http://localhost:5173",
    trace:            "on-first-retry",
    screenshot:       "only-on-failure",
    actionTimeout:    10_000,
    navigationTimeout: 15_000
  },

  projects: [
    {
      name:  "chromium",
      use:   { ...devices["Desktop Chrome"] }
    },
    {
      name:  "Mobile Chrome",
      use:   { ...devices["Pixel 5"] }
    }
  ],

  // Start the Vite preview server before tests
  webServer: {
    command:              "npm run build && npm run preview -- --port 5173",
    url:                  "http://localhost:5173",
    reuseExistingServer:  !process.env.CI,
    timeout:              90_000
  }
});
