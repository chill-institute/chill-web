import { expect, test } from "../support/fixtures";

test("private Stremio add-on setup", async ({ authenticatedPage: page, mockRpc }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockRpc({ GetFolder: { parent: { id: "0", name: "Your Files" }, files: [] } });
  await page.route("https://stremio.chill.institute/api/installations", (route) =>
    route.fulfill({
      json: {
        installations: [
          {
            id: "fixture-id",
            folderId: "0",
            createdAt: 1_789_300_000_000,
            manifestUrl: "https://stremio.chill.institute/addons/fixture-capability/manifest.json",
          },
        ],
      },
    }),
  );
  await page.goto("/stremio");
  await expect(page.getByRole("link", { name: "install in Stremio" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page).toHaveScreenshot("stremio-setup.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Revoke this add-on?" })).toBeVisible();
  await expect(page).toHaveScreenshot("stremio-revoke.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("Stremio acquisition confirmation", async ({ authenticatedPage: page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route(
    "https://stremio.chill.institute/api/installations/fixture-id/releases?**",
    (route) =>
      route.fulfill({
        json: {
          releases: [
            {
              id: "release-id",
              title: "Synthetic Feature Alpha 1080p",
              indexer: "fixture",
              size: "1073741824",
              seeders: "24",
            },
          ],
        },
      }),
  );
  await page.goto(
    "/stremio/acquire?installation=fixture-id&type=movie&target=chill%3Amovie%3Afixture",
  );
  await page.getByRole("radio").check();
  await expect(page.getByRole("button", { name: "confirm and send to put.io" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page).toHaveScreenshot("stremio-acquire.png", {
    fullPage: true,
    animations: "disabled",
  });
});
