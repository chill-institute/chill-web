import { test, expect } from "./support/fixtures";
import {
  downloadFolderResponse,
  folderResponse,
  indexer,
  indexersResponse,
  moviesResponse,
  tvShowsResponse,
  userFile,
  userSettings,
} from "./support/seeds";

const profileResponse = {
  userId: "1",
  username: "putio-user",
  avatarUrl: "",
  email: "putio-user@example.com",
};

test.describe("mobile settings (drawer branch of ResponsiveModal)", () => {
  test("settings trigger opens a bottom drawer on a small viewport", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse([]),
      GetTVShows: tvShowsResponse([]),
      GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]),
      GetUserProfile: profileResponse,
      GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("button", { name: "Open settings" }).click();

    const panel = authenticatedPage.locator('[data-page="settings"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("heading", { name: "settings" })).toBeVisible();
  });

  test("download folder picker works inside the mobile settings drawer", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const root = userFile({ id: 0n, name: "your files" });
    const movies = userFile({ id: 10n, name: "Movies" });
    let savedDownloadFolderID = "";

    await mockRpc({
      GetUserSettings: userSettings({ download: { folderId: 0n } }),
      GetMovies: moviesResponse([]),
      GetTVShows: tvShowsResponse([]),
      GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]),
      GetUserProfile: profileResponse,
      GetDownloadFolder: downloadFolderResponse(root),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      const body = route.request().postDataJSON() as { id?: string | number };
      const folderID = body.id !== undefined ? String(body.id) : "0";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          folderID === "10" ? folderResponse(movies, []) : folderResponse(root, [movies]),
        ),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: { download?: { folderId?: string | number } };
      };
      if (body.settings?.download?.folderId !== undefined) {
        savedDownloadFolderID = String(body.settings.download.folderId);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(userSettings({ download: { folderId: 10n } })),
      });
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("button", { name: "Open settings" }).click();

    const panel = authenticatedPage.locator('[data-page="settings"]');
    await panel.getByRole("button", { name: "change" }).scrollIntoViewIfNeeded();
    await panel.getByRole("button", { name: "change" }).click();

    const picker = authenticatedPage.getByRole("dialog", { name: "choose download folder" });
    await expect(picker).toBeVisible();
    const pickerBox = await picker.boundingBox();
    if (!pickerBox) throw new Error("Expected folder picker to have a visible bounding box");
    await authenticatedPage.touchscreen.tap(pickerBox.x + pickerBox.width / 2, pickerBox.y + 160);
    await expect(picker).toBeVisible();

    const moviesRow = picker.getByRole("button", { name: "Open folder Movies" });
    const moviesRowBox = await moviesRow.boundingBox();
    if (!moviesRowBox) throw new Error("Expected Movies row to have a visible bounding box");
    await authenticatedPage.touchscreen.tap(
      moviesRowBox.x + moviesRowBox.width / 2,
      moviesRowBox.y + moviesRowBox.height / 2,
    );
    await picker.getByRole("button", { name: "Use Movies as download folder" }).click();

    await expect.poll(() => savedDownloadFolderID).toBe("10");
  });

  test("theme select works inside the mobile settings drawer", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse([]),
      GetTVShows: tvShowsResponse([]),
      GetIndexers: indexersResponse([indexer({ id: "yts", name: "YTS" })]),
      GetUserProfile: profileResponse,
      GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("button", { name: "Open settings" }).click();

    const panel = authenticatedPage.locator('[data-page="settings"]');
    await expect(panel.getByRole("heading", { name: "settings" })).toBeVisible();

    const themeSelect = panel.getByRole("combobox", { name: "User-interface theme" });
    await expect(themeSelect).toHaveValue("system");
    await themeSelect.selectOption("dark");
    await expect(authenticatedPage.locator("html")).toHaveClass(/dark/);

    await themeSelect.selectOption("light");
    await expect(authenticatedPage.locator("html")).not.toHaveClass(/dark/);
  });
});
