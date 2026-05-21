import { defineConfig, devices } from "@playwright/test";

import { playwrightPort } from "./e2e/support/port";

delete process.env.NO_COLOR;

const port = playwrightPort(58310);
const baseURL = `http://localhost:${port}`;
const visualReleaseEnv = "VITE_PUBLIC_RELEASE=visual-test";
const desktopViewport = { width: 1920, height: 1080 };
const mobileDevice = devices["iPhone XR"];

export default defineConfig({
  testDir: "./e2e/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{projectName}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.003,
      threshold: 0.2,
    },
  },
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
      name: "desktop-dark",
      use: {
        viewport: desktopViewport,
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        colorScheme: "dark",
      },
    },
    {
      name: "mobile",
      use: {
        ...mobileDevice,
        browserName: "chromium",
      },
    },
    {
      name: "mobile-dark",
      use: {
        ...mobileDevice,
        browserName: "chromium",
        colorScheme: "dark",
      },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `vp preview --host 0.0.0.0 --port ${port}`
      : `${visualReleaseEnv} vp build && vp preview --host 0.0.0.0 --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    stdout: "pipe",
    stderr: "pipe",
  },
});
