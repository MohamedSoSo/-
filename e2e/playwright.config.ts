import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the already-running dev servers (see root README's `pnpm dev`)
 * rather than starting its own — this suite's job is smoke-testing the real
 * apps as deployed locally, not spinning up an isolated instance.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "customer", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3000" }, testMatch: /customer\.spec\.ts/ },
    { name: "pos", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3001" }, testMatch: /pos\.spec\.ts/ },
    { name: "bi", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3002" }, testMatch: /bi\.spec\.ts/ },
    { name: "admin", use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3003" }, testMatch: /admin\.spec\.ts/ },
    { name: "health", use: { ...devices["Desktop Chrome"] }, testMatch: /health\.spec\.ts/ },
  ],
});
