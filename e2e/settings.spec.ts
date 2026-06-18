import type { Page, Route } from "@playwright/test";
import {
  MoviesSource,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
} from "@chill-institute/contracts/chill/v4/api_pb";
import { test, expect } from "./support/fixtures";
import {
  downloadFolderResponse,
  folderResponse,
  indexer,
  indexersResponse,
  userSettings,
  userFile,
} from "./support/seeds";

const profileResponse = {
  userId: "1",
  username: "putio-user",
  avatarUrl: "",
  email: "putio-user@example.com",
};

const putioProviderUnavailableError = {
  code: "unavailable",
  message: "putio provider unavailable",
};

type RequestSettingsPayload = Record<string, unknown> & {
  catalog?: { moviesSource?: string | number };
  download?: { folderId?: string | number };
  search?: {
    disabledIndexerIds?: string[];
    searchResultDisplayBehavior?: number;
    searchResultTitleBehavior?: number;
    filterNastyResults?: boolean;
    filterResultsWithNoSeeders?: boolean;
    rememberQuickFilters?: boolean;
  };
};

const baseSettingsMethods = (overrides?: Record<string, unknown>) => ({
  GetUserSettings: userSettings(),
  GetIndexers: indexersResponse([
    indexer({ id: "yts", name: "YTS" }),
    indexer({ id: "rarbg", name: "RARBG" }),
  ]),
  GetUserProfile: profileResponse,
  GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
  ...overrides,
});

function settingsPage(page: Page) {
  return page.locator('[data-page="settings"]');
}

function folderPicker(page: Page) {
  return page.getByRole("dialog", { name: "choose download folder" });
}

async function fulfillPutioProviderUnavailable(route: Route) {
  await route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify(putioProviderUnavailableError),
  });
}

test.describe("settings", () => {
  test("folder picker loads via GetFolder and saves selected folder id", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings({ download: { folderId: 0n } });
    let selectedFolderID = "0";
    let savedDownloadFolderID = "";
    const folderRequests: string[] = [];

    const root = userFile({ id: 0n, name: "your files" });
    const movies = userFile({ id: 10n, name: "Movies" });
    const anime = userFile({ id: 11n, name: "Anime" });
    const folderByID = new Map<string, ReturnType<typeof userFile>>([
      ["0", root],
      ["10", movies],
      ["11", anime],
    ]);
    const folderResponseByID = new Map<string, unknown>([
      ["0", folderResponse(root, [movies])],
      ["10", folderResponse(movies, [anime])],
      ["11", folderResponse(anime, [])],
    ]);

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(downloadFolderResponse(folderByID.get(selectedFolderID) ?? root)),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      const body = route.request().postDataJSON() as { id?: string | number };
      const folderID = body.id !== undefined ? String(body.id) : "0";
      folderRequests.push(folderID);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folderResponseByID.get(folderID) ?? folderResponse(root, [])),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings?.download?.folderId !== undefined) {
        savedDownloadFolderID = String(body.settings.download.folderId);
        selectedFolderID = savedDownloadFolderID;
      }
      if (body.settings) {
        settingsState = body.settings as typeof settingsState;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");
    await authenticatedPage.getByRole("button", { name: "change" }).click();
    const picker = folderPicker(authenticatedPage);
    await expect(picker.getByLabel("At Your Files root")).toBeVisible();
    await expect(picker.getByRole("button", { name: "Go back to parent folder" })).toHaveCount(0);
    await authenticatedPage.getByRole("button", { name: "Open folder Movies" }).click();
    await expect(picker.getByRole("button", { name: "Go back to parent folder" })).toBeVisible();
    await authenticatedPage.getByRole("button", { name: "Use Movies as download folder" }).click();

    expect(folderRequests).toContain("0");
    expect(folderRequests).toContain("10");
    await expect.poll(() => savedDownloadFolderID).toBe("10");
  });

  test("folder picker can go back from a saved root-id folder alias", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const root = userFile({ id: 0n, name: "your files" });
    const chill = userFile({ id: 0n, name: "chill.institute" });
    const rss = userFile({ id: 12n, name: "rss" });

    await mockRpc(baseSettingsMethods({ GetDownloadFolder: downloadFolderResponse(chill) }));

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folderResponse(root, [chill, rss])),
      });
    });

    await authenticatedPage.goto("/settings");
    await authenticatedPage.getByRole("button", { name: "change" }).click();

    const picker = folderPicker(authenticatedPage);
    await expect(
      picker.getByRole("button", { name: "chill.institute", exact: true }),
    ).toBeVisible();

    await picker.getByRole("button", { name: "Go back to parent folder" }).click();

    await expect(picker.getByLabel("At Your Files root")).toBeVisible();
    await expect(picker.getByRole("button", { name: "Go back to parent folder" })).toHaveCount(0);
    await expect(picker.getByTitle("Your Files")).toBeVisible();
    await expect(picker.getByRole("button", { name: "Open folder rss" })).toBeVisible();
  });

  test("folder picker keeps long release names inside the fixed popover", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const root = userFile({ id: 0n, name: "your files" });
    const releaseFolder = userFile({
      id: 20n,
      name: "Long Release Folder Example (2025) [1080p] [WEBRip] [x265] [10bit] [YTS.MX]",
    });
    const subs = userFile({ id: 21n, name: "Subs" });

    await mockRpc(baseSettingsMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      const body = route.request().postDataJSON() as { id?: string | number };
      const folderID = body.id !== undefined ? String(body.id) : "0";
      const response =
        folderID === "20"
          ? folderResponse(releaseFolder, [subs])
          : folderID === "21"
            ? folderResponse(subs, [])
            : folderResponse(root, [releaseFolder]);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.goto("/settings");
    const trigger = authenticatedPage.getByRole("button", { name: "change" });
    const triggerBox = await trigger.boundingBox();
    await trigger.click();

    const picker = folderPicker(authenticatedPage);
    const row = picker.getByRole("button", {
      name: "Open folder Long Release Folder Example (2025) [1080p] [WEBRip] [x265] [10bit] [YTS.MX]",
    });

    await expect(row).toBeVisible();
    await expect
      .poll(async () => Math.round((await picker.boundingBox())?.width ?? 0))
      .toBeLessThanOrEqual(300);
    await expect
      .poll(async () => Math.round((await row.boundingBox())?.width ?? 0))
      .toBeLessThanOrEqual(292);

    await row.click();
    await picker.getByRole("button", { name: "Open folder Subs" }).click();
    await expect(picker.getByRole("button", { name: "show parent folders" })).toBeVisible();
    await expect(picker.getByRole("button", { name: "Subs", exact: true })).toBeVisible();

    const pickerBox = await picker.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(pickerBox).not.toBeNull();
    expect(
      Math.abs(pickerBox!.x + pickerBox!.width / 2 - (triggerBox!.x + triggerBox!.width / 2)),
    ).toBeLessThan(16);
  });

  test("changing download folder does not keep showing the stale saved folder name", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings({ download: { folderId: 0n } });
    let selectedFolderID = "0";

    const root = userFile({ id: 0n, name: "your files" });
    const movies = userFile({ id: 10n, name: "Movies" });
    const folderByID = new Map<string, ReturnType<typeof userFile>>([
      ["0", root],
      ["10", movies],
    ]);
    const folderResponseByID = new Map<string, unknown>([
      ["0", folderResponse(root, [movies])],
      ["10", folderResponse(movies, [])],
    ]);

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(downloadFolderResponse(folderByID.get(selectedFolderID) ?? root)),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      const body = route.request().postDataJSON() as { id?: string | number };
      const folderID = body.id !== undefined ? String(body.id) : "0";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folderResponseByID.get(folderID) ?? folderResponse(root, [])),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings?.download?.folderId !== undefined) {
        settingsState = body.settings as typeof settingsState;
        selectedFolderID = String(body.settings.download.folderId);
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");
    const visibleFolderName = settingsPage(authenticatedPage).getByText("your files");
    await expect(visibleFolderName).toBeVisible();

    await authenticatedPage.getByRole("button", { name: "change" }).click();
    await authenticatedPage.getByRole("button", { name: "Open folder Movies" }).click();
    await authenticatedPage.getByRole("button", { name: "Use Movies as download folder" }).click();

    await expect(visibleFolderName).toBeHidden({ timeout: 400 });
    await expect(settingsPage(authenticatedPage).getByText("Movies")).toBeVisible({
      timeout: 2000,
    });
  });

  test("download folder picker reopens at the saved folder after closing without saving", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    const root = userFile({ id: 0n, name: "your files" });
    const movies = userFile({ id: 10n, name: "Movies" });
    const anime = userFile({ id: 11n, name: "Anime" });
    const folderResponseByID = new Map<string, unknown>([
      ["0", folderResponse(root, [movies])],
      ["10", folderResponse(movies, [anime])],
      ["11", folderResponse(anime, [])],
    ]);

    await mockRpc(baseSettingsMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetFolder", async (route) => {
      const body = route.request().postDataJSON() as { id?: string | number };
      const folderID = body.id !== undefined ? String(body.id) : "0";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(folderResponseByID.get(folderID) ?? folderResponse(root, [])),
      });
    });

    await authenticatedPage.goto("/settings");

    await authenticatedPage.getByRole("button", { name: "change" }).click();
    let picker = folderPicker(authenticatedPage);
    await expect(picker.getByTitle("Your Files")).toBeVisible();
    await picker.getByRole("button", { name: "Open folder Movies" }).click();
    await expect(picker.getByText("Anime")).toBeVisible();

    await picker.getByLabel("Close").click();
    await authenticatedPage.getByRole("button", { name: "change" }).click();

    picker = folderPicker(authenticatedPage);
    await expect(picker.getByTitle("Your Files")).toBeVisible();
    await expect(picker.getByRole("button", { name: "Open folder Movies" })).toBeVisible();
  });

  test("download folder errors show a real error message", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(baseSettingsMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await authenticatedPage.goto("/settings");

    await expect(
      settingsPage(authenticatedPage)
        .getByRole("alert")
        .filter({ hasText: "Service temporarily unavailable. Please try again shortly." }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("put.io provider errors show retry and sign-in actions", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(baseSettingsMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
      await fulfillPutioProviderUnavailable(route);
    });

    await authenticatedPage.goto("/settings");

    const alert = settingsPage(authenticatedPage)
      .getByRole("alert")
      .filter({ hasText: "Could not connect to put.io. Please try again." });

    await expect(alert).toBeVisible({ timeout: 5000 });
    await expect(alert.getByRole("button", { name: "retry" })).toBeVisible();
    await expect(alert.getByRole("button", { name: "sign in again" })).toBeVisible();
  });

  test("sign-in recovery completes auth success and returns to settings", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let providerRecovered = false;

    await mockRpc(baseSettingsMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
      if (!providerRecovered) {
        await fulfillPutioProviderUnavailable(route);
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(downloadFolderResponse(userFile({ id: 0n, name: "your files" }))),
      });
    });

    await authenticatedPage.route(/\/auth\/putio\/start/, (route) =>
      route.fulfill({ status: 200, body: "" }),
    );

    await authenticatedPage.goto("/settings");

    const alert = settingsPage(authenticatedPage)
      .getByRole("alert")
      .filter({ hasText: "Could not connect to put.io. Please try again." });
    await expect(alert).toBeVisible({ timeout: 5000 });

    const startRequest = authenticatedPage.waitForRequest(/\/auth\/putio\/start/);
    await alert.getByRole("button", { name: "sign in again" }).click();
    const startURL = (await startRequest).url();

    const successURL = new URL(startURL).searchParams.get("success_url");
    expect(successURL).not.toBeNull();
    const authSuccessURL = new URL(successURL!);
    const nonce = authSuccessURL.searchParams.get("nonce");
    expect(nonce).toMatch(/^[0-9a-f]{32}$/);

    providerRecovered = true;
    authSuccessURL.hash = new URLSearchParams({ auth_token: "recovered-token" }).toString();
    await authenticatedPage.goto(authSuccessURL.toString());

    await authenticatedPage.waitForURL("**/settings");
    expect(new URL(authenticatedPage.url()).pathname).toBe("/settings");
    expect(
      await authenticatedPage.evaluate(() => window.localStorage.getItem("chill.auth_token")),
    ).toBe("recovered-token");
    await expect(alert).toBeHidden({ timeout: 5000 });
  });

  test("shows username from profile", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(baseSettingsMethods());
    await authenticatedPage.goto("/settings");

    await expect(settingsPage(authenticatedPage).getByText("putio-user")).toBeVisible({
      timeout: 5000,
    });
  });

  test("reset settings restores search defaults and preserves download folder", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings({
      catalog: { moviesSource: MoviesSource.YTS },
      download: { folderId: 42n },
      filterNastyResults: false,
      rememberQuickFilters: true,
    });
    let savedSettings: RequestSettingsPayload | undefined;

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings) {
        savedSettings = body.settings;
        settingsState = body.settings as typeof settingsState;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");
    await settingsPage(authenticatedPage).getByRole("button", { name: "reset settings" }).click();

    await expect.poll(() => savedSettings?.search?.filterNastyResults).toBe(true);
    expect(savedSettings?.search?.rememberQuickFilters ?? false).toBe(false);
    expect(String(savedSettings?.download?.folderId)).toBe("42");
    expect(String(savedSettings?.catalog?.moviesSource)).toMatch(/YTS|2/);
  });

  test("sign-out link navigates to sign-out page", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(baseSettingsMethods());
    await authenticatedPage.goto("/settings");

    await expect(settingsPage(authenticatedPage).getByText("Signed in as")).toBeVisible();

    const signOutLink = settingsPage(authenticatedPage).getByRole("link", { name: "sign out" });
    await expect(signOutLink).toBeVisible();
    await signOutLink.click();

    await authenticatedPage.waitForURL("**/sign-in**");
    expect(authenticatedPage.url()).toContain("/sign-in");
  });

  test("toggling indexer checkbox saves disabled indexer ids", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings();
    let savedDisabledIds: string[] = [];
    let saveCalls = 0;

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      saveCalls += 1;
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings) {
        settingsState = body.settings as typeof settingsState;
        savedDisabledIds = body.settings.search?.disabledIndexerIds ?? [];
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");

    const ytsLabel = settingsPage(authenticatedPage).locator("label").filter({ hasText: "YTS" });
    await expect(ytsLabel).toBeVisible({ timeout: 5000 });
    await ytsLabel.click();

    await expect.poll(() => saveCalls).toBeGreaterThan(0);
    await expect.poll(() => savedDisabledIds).toContain("yts");
  });

  test("search settings toggles persist", async ({ authenticatedPage, mockRpc }) => {
    let settingsState = userSettings({
      filterNastyResults: true,
      filterResultsWithNoSeeders: false,
    });
    let savedFilterNasty: boolean | undefined;
    let savedFilterNoSeeders: boolean | undefined;
    let saveCalls = 0;
    let releaseFirstSave: (() => void) | undefined;
    const savedSearches: NonNullable<RequestSettingsPayload["search"]>[] = [];

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      saveCalls += 1;
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings?.search) {
        savedSearches.push(body.settings.search);
      }
      if (saveCalls === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstSave = resolve;
        });
      }
      if (body.settings) {
        settingsState = body.settings as typeof settingsState;
        savedFilterNasty = body.settings.search?.filterNastyResults;
        savedFilterNoSeeders = body.settings.search?.filterResultsWithNoSeeders;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");

    const nastyCheckbox = settingsPage(authenticatedPage).getByRole("checkbox", {
      name: "Try to filter out nasty stuff",
    });
    await expect(nastyCheckbox).toHaveAttribute("aria-checked", "true", { timeout: 5000 });

    await nastyCheckbox.click();
    await expect.poll(() => saveCalls).toBe(1);

    const noSeedersCheckbox = settingsPage(authenticatedPage).getByRole("checkbox", {
      name: "Hide results with no peers",
    });
    await expect(noSeedersCheckbox).toHaveAttribute("aria-checked", "false");

    await noSeedersCheckbox.click();
    releaseFirstSave?.();
    await expect.poll(() => saveCalls).toBe(2);
    await expect.poll(() => savedFilterNoSeeders).toBe(true);
    await expect.poll(() => savedFilterNasty).not.toBe(true);
    expect(savedSearches.at(-1)?.filterNastyResults).not.toBe(true);
    expect(savedSearches.at(-1)?.filterResultsWithNoSeeders).toBe(true);
  });

  test("search preferences bar persists resolution and sort", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings();
    const savedSearches: NonNullable<RequestSettingsPayload["search"]>[] = [];
    let saveCalls = 0;

    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      saveCalls += 1;
      const body = route.request().postDataJSON() as { settings?: RequestSettingsPayload };
      if (body.settings?.search) {
        savedSearches.push(body.settings.search);
      }
      if (body.settings) {
        settingsState = body.settings as typeof settingsState;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/settings");

    const prefs = settingsPage(authenticatedPage).getByRole("group", { name: /quick filters/i });
    await expect(prefs).toBeVisible({ timeout: 5000 });

    // Choosing a resolution persists it and implies remembering.
    await prefs.getByRole("checkbox", { name: "1080p" }).click();
    await expect.poll(() => savedSearches.at(-1)?.rememberQuickFilters).toBe(true);
    await expect
      .poll(
        () =>
          (savedSearches.at(-1) as { resolutionFilters?: unknown[] }).resolutionFilters?.length ??
          0,
      )
      .toBeGreaterThan(0);

    // The sort pulldown is present and persists a change.
    const callsBeforeSort = saveCalls;
    await prefs.getByRole("combobox", { name: "Sort results" }).selectOption({ label: "↑ SIZE" });
    await expect.poll(() => saveCalls).toBeGreaterThan(callsBeforeSort);
  });

  test("theme select changes document theme", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(baseSettingsMethods());
    await authenticatedPage.goto("/settings");

    await expect(settingsPage(authenticatedPage).getByText("putio-user")).toBeVisible({
      timeout: 5000,
    });

    const themeSelect = settingsPage(authenticatedPage).getByRole("combobox", {
      name: "User-interface theme",
    });
    await themeSelect.selectOption("dark");
    await expect(authenticatedPage.locator("html")).toHaveClass(/dark/);

    await themeSelect.selectOption("light");
    await expect(authenticatedPage.locator("html")).not.toHaveClass(/dark/);
  });

  test("mobile settings drawer select values stay openable and persist", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let settingsState = userSettings({
      searchResultDisplayBehavior: SearchResultDisplayBehavior.FASTEST,
      searchResultTitleBehavior: SearchResultTitleBehavior.TEXT,
    });
    let savedDisplayBehavior: number | string | undefined;
    let savedTitleBehavior: number | string | undefined;
    let saveCalls = 0;

    await authenticatedPage.setViewportSize({ width: 390, height: 844 });
    await mockRpc(baseSettingsMethods({ GetUserSettings: settingsState }));

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      saveCalls += 1;
      const body = route.request().postDataJSON() as {
        settings?: RequestSettingsPayload;
      };
      if (body.settings) {
        settingsState = body.settings as typeof settingsState;
        savedDisplayBehavior = body.settings.search?.searchResultDisplayBehavior;
        savedTitleBehavior = body.settings.search?.searchResultTitleBehavior;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(settingsState),
      });
    });

    await authenticatedPage.goto("/");
    await authenticatedPage.getByRole("button", { name: "settings" }).click();

    const panel = settingsPage(authenticatedPage);
    await expect(panel.getByRole("heading", { name: "settings" })).toBeVisible({
      timeout: 5000,
    });

    const displaySelect = panel.getByRole("combobox", {
      name: "Search result display behavior",
    });
    await displaySelect.scrollIntoViewIfNeeded();
    await expect(displaySelect).toHaveValue(String(SearchResultDisplayBehavior.FASTEST));
    await displaySelect.selectOption(String(SearchResultDisplayBehavior.ALL));
    await expect(displaySelect).toHaveValue(String(SearchResultDisplayBehavior.ALL));

    const nameSelect = panel.getByRole("combobox", { name: "Search result name behavior" });
    await nameSelect.scrollIntoViewIfNeeded();
    await expect(nameSelect).toHaveValue(String(SearchResultTitleBehavior.TEXT));
    await nameSelect.selectOption(String(SearchResultTitleBehavior.LINK));
    await expect(nameSelect).toHaveValue(String(SearchResultTitleBehavior.LINK));

    await expect.poll(() => saveCalls).toBeGreaterThanOrEqual(1);
    expect(String(savedDisplayBehavior)).toMatch(/ALL|1/);
    expect(String(savedTitleBehavior)).toMatch(/LINK|1/);
  });

  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForURL("**/sign-in**");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("callbackUrl")).toBe("/settings");
  });
});
