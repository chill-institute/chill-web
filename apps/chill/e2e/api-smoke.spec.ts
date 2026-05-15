import { expect, test, type Browser } from "@playwright/test";

const TOKEN = process.env.CHILL_TOKEN ?? "";
const BASE = process.env.AUTHED_BASE ?? "http://localhost:58311";
const BASE_ORIGIN = new URL(BASE).origin;

test.skip(!TOKEN, "set CHILL_TOKEN to run the real-backend smoke");

async function authedContext(browser: Browser) {
  return browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        { origin: BASE_ORIGIN, localStorage: [{ name: "chill.auth_token", value: TOKEN }] },
      ],
    },
  });
}

test.describe("chill · @chill-institute/api smoke", () => {
  test("home renders the welcome shell after the shared client loads settings", async ({
    browser,
  }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

      await expect(
        page.getByRole("heading", { name: /welcome to chill\.institute/i }),
      ).toBeVisible();
      await expect(page.getByLabel(/what can we hook you up with/i)).toBeVisible();
      await expect(page.getByRole("tab", { name: "movies" })).toHaveCount(0);
      await expect(page.getByRole("tab", { name: "tv shows" })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("search query runs through the shared search RPC and renders results", async ({
    browser,
  }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 1200 });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

      const input = page.getByLabel(/what can we hook you up with/i);
      await input.fill("dune");
      await input.press("Enter");

      await page.waitForURL(/\/search/, { timeout: 10_000 });
      await expect
        .poll(
          async () => {
            const [skeletons, rows, cells] = await Promise.all([
              page.locator('[data-state="loading"]').count(),
              page.locator("table tbody tr").count(),
              page.locator("table tbody td").count(),
            ]);
            return skeletons === 0 && (rows > 0 || cells > 0);
          },
          { timeout: 30_000 },
        )
        .toBe(true);
    } finally {
      await context.close();
    }
  });

  test("settings opens and shows the post-refresh search-only panel", async ({ browser }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 1100 });
      await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });

      await expect(page.getByText(/signed in as/i)).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole("switch", { name: /show movies in the home page/i })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("switch", { name: /show tv shows in the home page/i }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
