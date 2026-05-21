import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  MoviesSource,
  SearchResultDisplayBehavior,
} from "@chill-institute/contracts/chill/v4/api_pb";
import type { Page } from "@playwright/test";

import { expect, test } from "../support/fixtures";
import {
  downloadFolderResponse,
  indexer,
  indexersResponse,
  movie,
  moviesResponse,
  searchResponse,
  searchResult,
  tvShowsResponse,
  userFile,
  userSettings,
} from "../support/seeds";

const visualStylePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "visual-stability.css",
);

const visualOptions = {
  animations: "disabled" as const,
  caret: "hide" as const,
  fullPage: true,
  stylePath: visualStylePath,
};

const mobileDrawerVisualOptions = {
  ...visualOptions,
  maxDiffPixelRatio: 0.025,
};

const movies = [
  movie({
    id: "m1",
    title: "Synthetic Feature Alpha",
    titlePretty: "Synthetic Feature Alpha",
    year: 2010,
    rating: 8.8,
    genres: ["Science Fiction", "Action"],
    posterUrl: "/test/poster.svg",
    source: MoviesSource.IMDB_MOVIEMETER,
  }),
  movie({
    id: "m2",
    title: "Synthetic Feature Beta",
    titlePretty: "Synthetic Feature Beta",
    year: 2014,
    rating: 8.7,
    genres: ["Drama"],
    posterUrl: "/test/poster.svg",
    source: MoviesSource.IMDB_MOVIEMETER,
  }),
];

function defaultMethods(overrides?: Record<string, unknown>) {
  return {
    GetUserSettings: userSettings({
      searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
    }),
    GetMovies: moviesResponse(movies),
    GetTVShows: tvShowsResponse([]),
    GetIndexers: indexersResponse([
      indexer({ id: "tracker-one", name: "Tracker One" }),
      indexer({ id: "tracker-two", name: "Tracker Two" }),
    ]),
    GetUserProfile: {
      userId: "visual-user",
      username: "visual",
      avatarUrl: "",
      email: "visual@example.test",
    },
    GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
    ...overrides,
  };
}

async function freezeVisualClock(page: Page) {
  await page.clock.setFixedTime(new Date("2026-05-20T12:00:00Z"));
}

test("sign-in page", async ({ page }) => {
  await freezeVisualClock(page);
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: "sign in with put.io" })).toBeVisible();
  await expect(page).toHaveScreenshot("sign-in-page.png", visualOptions);
});

test("movies catalog", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());

  await authenticatedPage.goto("/movies");

  await expect(authenticatedPage.getByText("Synthetic Feature Alpha")).toBeVisible();
  await expect(authenticatedPage.getByText("Synthetic Feature Beta")).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("movies-catalog.png", visualOptions);
});

test("movie detail modal", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(
    defaultMethods({
      Search: searchResponse("Synthetic Feature Alpha 2010", [
        searchResult({
          id: "sr1",
          title: "Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE",
          seeders: 200n,
          size: 2147483648n,
          indexer: "Tracker One",
          source: "Tracker One",
        }),
        searchResult({
          id: "sr2",
          title: "Synthetic.Feature.Alpha.2010.2160p.WEB-DL.x265.HDR-FIXTURE",
          seeders: 80n,
          size: 8589934592n,
          indexer: "Tracker Two",
          source: "Tracker Two",
        }),
      ]),
    }),
  );

  await authenticatedPage.goto("/movies");
  await authenticatedPage.locator('[data-slot="poster-card"]').first().click();

  const dialog = authenticatedPage.getByRole("dialog", { name: "Synthetic Feature Alpha details" });
  await expect(
    dialog.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE"),
  ).toBeVisible();
  await expect(dialog).toHaveScreenshot(
    "movie-detail-modal.png",
    testInfo.project.name.startsWith("mobile") ? mobileDrawerVisualOptions : visualOptions,
  );
});

test("search results", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(
    defaultMethods({
      Search: searchResponse("synthetic", [
        searchResult({
          id: "r1",
          title: "Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE",
          seeders: 150n,
          size: 2147483648n,
          indexer: "Tracker One",
          source: "Tracker One",
        }),
        searchResult({
          id: "r2",
          title: "Synthetic.Feature.Alpha.2010.2160p.WEB-DL.x265.HDR-FIXTURE",
          seeders: 80n,
          size: 8589934592n,
          indexer: "Tracker Two",
          source: "Tracker Two",
        }),
      ]),
    }),
  );

  await authenticatedPage.goto("/search?q=synthetic");

  await expect(
    authenticatedPage.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE").first(),
  ).toBeVisible();
  await expect(
    authenticatedPage
      .getByText("Synthetic.Feature.Alpha.2010.2160p.WEB-DL.x265.HDR-FIXTURE")
      .first(),
  ).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("search-results.png", visualOptions);
});

test("settings modal", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());

  await authenticatedPage.goto("/movies");
  await authenticatedPage.getByRole("button", { name: "settings" }).click();

  await expect(authenticatedPage.locator('[data-page="settings"]')).toBeVisible();
  await expect(authenticatedPage.getByText("visual", { exact: true })).toBeVisible();
  await expect(authenticatedPage.getByText("Search settings")).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("settings-modal.png", visualOptions);
});
