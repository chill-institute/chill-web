import { test, expect } from "./support/fixtures";
import {
  downloadFolderResponse,
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
      GetUserSettings: userSettings({ showMovies: true }),
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
});
