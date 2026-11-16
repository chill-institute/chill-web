import { expect, test } from "../support/fixtures";
import { downloadFolderResponse, userFile } from "../support/seeds";

const screenshot = { fullPage: true, animations: "disabled" } as const;

test("Stremio add-on setup", async ({ authenticatedPage: page, mockRpc, isMobile }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockRpc({
    GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
  });
  await page.route("https://api.chill.institute/stremio/**", (route) =>
    route.fulfill({ json: { credential: "fixture-credential" } }),
  );
  await page.goto("/stremio");
  await expect(page.getByText("your files", { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot("stremio-setup.png", screenshot);

  const createLink = page.getByRole("button", { name: "get add-on link" });
  if (isMobile) {
    await createLink.tap();
  } else {
    await createLink.click();
  }
  await expect(page.getByRole("button", { name: "get a new link" })).toBeEnabled();
  await expect(page.getByRole("link", { name: "install chill" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page).toHaveScreenshot("stremio-link.png", screenshot);

  await page.getByRole("button", { name: "disconnect Stremio" }).click();
  await expect(page.getByRole("dialog", { name: "Disconnect Stremio?" })).toBeVisible();
  await expect(page).toHaveScreenshot("stremio-disconnect.png", screenshot);
});
