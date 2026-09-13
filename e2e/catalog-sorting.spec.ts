import { fromJsonString, toJsonString } from "@bufbuild/protobuf";
import { CatalogSort, UserSettingsSchema } from "@chill-institute/contracts/chill/v4/api_pb";
import { expect, fulfillSubmittedSettings, readSubmittedSettings, test } from "./support/fixtures";
import { movie, moviesResponse, tvShow, tvShowsResponse, userSettings } from "./support/seeds";

const entries = [
  { title: "Aurora", rating: 8, year: 2020, date: "2020-01-10" },
  { title: "Harbor", rating: 9, year: 2010, date: "2010-06-15" },
  { title: "Signal", rating: 7, year: 2020, date: "2020-12-10" },
];

const catalogResponses = {
  GetMovies: moviesResponse(
    entries.map(({ date, ...entry }, index) =>
      movie({ ...entry, releaseDate: date, id: `m${index}` }),
    ),
  ),
  GetTVShows: tvShowsResponse(
    entries.map(({ date, ...entry }, index) =>
      tvShow({ ...entry, firstAirDate: date, imdbId: `tt${index}` }),
    ),
  ),
};

for (const path of ["movies", "tv-shows"]) {
  test(`${path} sorts in both directions and restores default order`, async ({
    authenticatedPage: page,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      ...catalogResponses,
    });
    await page.route("**/chill.v4.UserService/SaveUserSettings", fulfillSubmittedSettings);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${path}?sort=invalid`);
    const sort = page.getByRole("combobox", { name: "Sort by" });
    const titles = page.locator('[data-slot="poster-card"] h2');
    await expect(sort).toHaveValue("default");
    await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
    for (const [value, expected] of [
      ["rating-desc", ["Harbor", "Aurora", "Signal"]],
      ["rating-asc", ["Signal", "Aurora", "Harbor"]],
      ["date-desc", ["Signal", "Aurora", "Harbor"]],
      ["date-asc", ["Harbor", "Aurora", "Signal"]],
    ] as const) {
      await sort.selectOption(value);
      await expect(titles).toHaveText([...expected]);
      await expect(page).toHaveURL(new RegExp(`sort=${value}`));
    }
    await page.reload();
    await expect(sort).toHaveValue("date-asc");
    await expect(titles).toHaveText(["Harbor", "Aurora", "Signal"]);
    await expect(page.locator('[data-slot="poster-card"]').first()).toHaveAttribute(
      "href",
      /sort=date-asc/,
    );
    const source = page.getByRole("combobox", {
      name: path === "movies" ? "Movie source" : "TV source",
    });
    await source.focus();
    await page.keyboard.press("Tab");
    await expect(sort).toBeFocused();
    await sort.press("Home");
    await sort.press("Enter");
    await expect(sort).toHaveValue("default");
    await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
    for (const width of [320, 375, 430]) {
      await page.setViewportSize({ width, height: 812 });
      const sourceBox = await source.boundingBox();
      const sortBox = await sort.boundingBox();
      expect(sourceBox).not.toBeNull();
      expect(sortBox).not.toBeNull();
      if (width < 375) expect(sortBox?.width).toBe(sourceBox?.width);
      else expect(sortBox?.width).toBeLessThan(sourceBox?.width ?? 0);
      expect(sortBox?.y).toBe(sourceBox?.y);
      expect(sortBox?.x).toBeGreaterThan(sourceBox?.x ?? 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });
}

test("shares one catalog preference across pages while sort URLs stay view-only", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  let stored = fromJsonString(
    UserSettingsSchema,
    JSON.stringify(
      userSettings({
        catalog: {
          sort: CatalogSort.RATING_DESC,
        },
      }),
    ),
  );
  let saves = 0;
  await mockRpc(catalogResponses);
  await page.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: toJsonString(UserSettingsSchema, stored),
    });
  });
  await page.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
    stored = fromJsonString(UserSettingsSchema, JSON.stringify(readSubmittedSettings(route)));
    saves++;
    await route.fulfill({
      contentType: "application/json",
      body: toJsonString(UserSettingsSchema, stored),
    });
  });
  const sort = page.getByRole("combobox", { name: "Sort by" });
  const titles = page.locator('[data-slot="poster-card"] h2');

  await page.goto("/movies?sort=year-desc");
  await expect(sort).toHaveValue("date-desc");
  await expect(titles).toHaveText(["Signal", "Aurora", "Harbor"]);
  expect(saves).toBe(0);
  await page.goto("/movies");
  await expect(sort).toHaveValue("rating-desc");
  await expect(titles).toHaveText(["Harbor", "Aurora", "Signal"]);
  await sort.selectOption("rating-asc");
  await expect.poll(() => stored.catalog?.sort).toBe(CatalogSort.RATING_ASC);
  await page.getByRole("link", { name: "tv shows", exact: true }).click();
  await expect(sort).toHaveValue("rating-asc");
  await expect(titles).toHaveText(["Signal", "Aurora", "Harbor"]);
  await sort.selectOption("date-desc");
  await expect.poll(() => stored.catalog?.sort).toBe(CatalogSort.RELEASE_DATE_DESC);
  await page.getByRole("link", { name: "movies", exact: true }).click();
  await expect(sort).toHaveValue("date-desc");
  await expect(titles).toHaveText(["Signal", "Aurora", "Harbor"]);
  await sort.selectOption("default");
  await expect.poll(() => stored.catalog?.sort).toBe(CatalogSort.POPULARITY);
  await page.goto("/tv-shows");
  await expect(sort).toHaveValue("default");
  await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
  await page.goto("/movies");
  await expect(sort).toHaveValue("default");
  await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
});

test("keeps sorted movies visible during saving and reports failure without losing the view", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  await mockRpc({
    ...catalogResponses,
    GetUserSettings: userSettings({ catalog: { sort: CatalogSort.RATING_DESC } }),
  });
  const saveStarted = Promise.withResolvers<void>();
  const saveRelease = Promise.withResolvers<void>();
  await page.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
    saveStarted.resolve();
    await saveRelease.promise;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ code: "internal", message: "Couldn't save settings" }),
    });
  });
  const sort = page.getByRole("combobox", { name: "Sort by" });
  const titles = page.locator('[data-slot="poster-card"] h2');
  await page.goto("/movies");
  await expect(sort).toHaveValue("rating-desc");
  await expect(titles).toHaveText(["Harbor", "Aurora", "Signal"]);
  await sort.selectOption("default");
  await saveStarted.promise;
  try {
    await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
    await expect(sort).toHaveValue("default");
  } finally {
    saveRelease.resolve();
  }
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(sort).toHaveValue("default");
  await expect(page).toHaveURL(/sort=default/);
  await page.reload();
  await expect(sort).toHaveValue("default");
  await expect(titles).toHaveText(["Aurora", "Harbor", "Signal"]);
  await page.goto("/movies");
  await expect(sort).toHaveValue("rating-desc");
});

test("saves a TV sort chosen before account settings finish loading", async ({
  authenticatedPage: page,
  mockRpc,
}) => {
  const initialRead = Promise.withResolvers<void>();
  const releaseRead = Promise.withResolvers<void>();
  let reads = 0;
  let savedSort: CatalogSort | undefined;
  await mockRpc(catalogResponses);
  await page.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
    if (++reads === 1) {
      initialRead.resolve();
      await releaseRead.promise;
    }
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(userSettings()) });
  });
  await page.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
    const settings = fromJsonString(
      UserSettingsSchema,
      JSON.stringify(readSubmittedSettings(route)),
    );
    savedSort = settings.catalog?.sort;
    await route.fulfill({
      contentType: "application/json",
      body: toJsonString(UserSettingsSchema, settings),
    });
  });
  await page.goto("/tv-shows");
  await initialRead.promise;
  try {
    await expect(page.locator('[data-slot="poster-card"] h2')).toHaveText([
      "Aurora",
      "Harbor",
      "Signal",
    ]);
    await page.getByRole("combobox", { name: "Sort by" }).selectOption("rating-asc");
    await expect.poll(() => savedSort).toBe(CatalogSort.RATING_ASC);
  } finally {
    releaseRead.resolve();
  }
});
