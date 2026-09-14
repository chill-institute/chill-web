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
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page).toHaveScreenshot("stremio-setup.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "revoke", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Revoke this connection?" })).toBeVisible();
  await expect(page).toHaveScreenshot("stremio-revoke.png", {
    fullPage: true,
    animations: "disabled",
  });
});
