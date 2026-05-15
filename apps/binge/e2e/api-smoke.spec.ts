import { expect, test, type Browser } from "@playwright/test";

const TOKEN = process.env.CHILL_TOKEN ?? "";
const BASE = process.env.AUTHED_BASE ?? "http://localhost:58410";
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

test.describe("binge · @chill-institute/api smoke", () => {
  test("home loads movies catalog through the shared client", async ({ browser }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 1100 });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

      await expect(page.getByRole("link", { name: /binge\.institute/i })).toBeVisible();
      await expect(page.getByRole("tab", { name: "movies" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => page.locator("article").count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

  test("tv tab loads through the shared client and renders shows", async ({ browser }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 1100 });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

      await page.getByRole("tab", { name: "tv shows" }).click();
      await expect(page.getByRole("tab", { name: "tv shows" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(async () => page.locator("article").count(), { timeout: 30_000 })
        .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });

  test("movie modal pulls torrent results through the shared search RPC", async ({ browser }) => {
    const context = await authedContext(browser);
    try {
      const page = await context.newPage();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setViewportSize({ width: 1280, height: 1100 });
      await page.goto(`${BASE}/`, { waitUntil: "networkidle" });

      await expect(page.locator("article").first()).toBeVisible({ timeout: 30_000 });
      await page.locator("article").first().click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect
        .poll(
          async () => {
            const [rows, empty] = await Promise.all([
              dialog
                .locator('[role="list"][aria-label="Torrent results list"] [role="listitem"]')
                .count(),
              dialog.getByText(/no torrent results found|no results match these filters/i).count(),
            ]);
            return rows + empty;
          },
          { timeout: 30_000 },
        )
        .toBeGreaterThan(0);
    } finally {
      await context.close();
    }
  });
});
