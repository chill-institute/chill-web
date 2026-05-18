import { defineConfig } from "@playwright/test";
import { playwrightPort } from "./e2e/support/port";

// Playwright/webServer child processes force color in this environment.
// Drop NO_COLOR here so Node does not warn about the conflicting pair.
delete process.env.NO_COLOR;

const port = playwrightPort(58300);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL,
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: process.env.CI
      ? `vp preview --host 0.0.0.0 --port ${port}`
      : `vp build && vp preview --host 0.0.0.0 --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    stdout: "pipe",
    stderr: "pipe",
  },
});
