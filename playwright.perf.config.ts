import { defineConfig, devices } from "@playwright/test";

import { playwrightPort } from "./e2e/support/port";

delete process.env.NO_COLOR;

const port = playwrightPort(58330);
const baseURL = `http://localhost:${port}`;
const desktopViewport = { width: 1920, height: 1080 };

export default defineConfig({
  testDir: "./e2e/perf",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  use: {
    baseURL,
    browserName: "chromium",
    colorScheme: "light",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: desktopViewport,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone XR"],
        browserName: "chromium",
      },
    },
  ],
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
