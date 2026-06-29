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
  tvShow,
  tvShowDetail,
  tvShowDetailResponse,
  tvShowDownload,
  tvShowEpisode,
  tvShowSeason,
  tvShowSeasonDownloadsResponse,
  tvShowSeasonResponse,
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
  maxDiffPixelRatio: 0.035,
  stylePath: visualStylePath,
};

const mobileDrawerVisualOptions = {
  ...visualOptions,
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

const tvShows = [
  tvShow({
    imdbId: "tt9000003",
    title: "Synthetic Show Gamma",
    year: 2025,
    rating: 8.5,
    posterUrl: "/test/poster.svg",
  }),
];

function errorResponse(message = "Service temporarily unavailable. Please try again shortly.") {
  return {
    code: "unavailable",
    message,
  };
}

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

test("sign-in session expired", async ({ page }) => {
  await freezeVisualClock(page);
  await page.goto("/sign-in?error=SessionExpired&callbackUrl=/movies");
  await expect(page.getByText("your session expired. sign in again to keep going.")).toBeVisible();
  await expect(page).toHaveScreenshot("sign-in-session-expired.png", visualOptions);
});

test("cli token page", async ({ authenticatedPage }) => {
  await freezeVisualClock(authenticatedPage);
  await authenticatedPage.goto("/auth/cli-token");
  await expect(authenticatedPage.getByRole("heading", { name: "CLI token" })).toBeVisible();
  await expect(authenticatedPage.getByLabel("CLI auth token")).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("cli-token-page.png", visualOptions);
});

test("backend unavailable screen", async ({ page }) => {
  await freezeVisualClock(page);
  await page.unroute("**/healthz");
  await page.route("**/healthz", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ status: "unavailable" }),
    });
  });

  await page.goto("/movies");

  await expect(
    page.getByRole("heading", { name: "The Institute is having a moment…" }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("backend-unavailable-screen.png", visualOptions);
});

test("app error fallback", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc({ GetUserSettings: userSettings() });

  await authenticatedPage.goto("/debug/crash");

  await expect(
    authenticatedPage.getByRole("heading", { name: "Something went wrong." }),
  ).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("app-error-fallback.png", visualOptions);
});

test("not found screen", async ({ page }) => {
  await freezeVisualClock(page);
  await page.goto("/definitely-not-here");
  await expect(page.getByRole("heading", { name: "page not found" })).toBeVisible();
  await expect(page).toHaveScreenshot("not-found-screen.png", visualOptions);
});

test("movies catalog", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());

  await authenticatedPage.goto("/movies");

  await expect(authenticatedPage.getByText("Synthetic Feature Alpha")).toBeVisible();
  await expect(authenticatedPage.getByText("Synthetic Feature Beta")).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("movies-catalog.png", visualOptions);
});

test("movies catalog error", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());
  await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(errorResponse()),
    });
  });

  await authenticatedPage.goto("/movies");

  await expect(
    authenticatedPage.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expect(authenticatedPage).toHaveScreenshot("movies-catalog-error.png", visualOptions);
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

test("movie detail modal loading", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());

  let releaseSearch: () => void = () => {};
  const delayedSearch = new Promise<void>((resolve) => {
    releaseSearch = resolve;
  });
  const searchRequested = new Promise<void>((resolve) => {
    void authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
      resolve();
      await delayedSearch;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(searchResponse("Synthetic Feature Alpha 2010", [])),
      });
    });
  });

  await authenticatedPage.goto("/movies");
  await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
  await searchRequested;

  const dialog = authenticatedPage.getByRole("dialog", { name: "Synthetic Feature Alpha details" });
  await expect(dialog.locator("[data-detail-modal-body]")).toBeVisible();
  await expect(dialog).toHaveScreenshot(
    "movie-detail-modal-loading.png",
    testInfo.project.name.startsWith("mobile") ? mobileDrawerVisualOptions : visualOptions,
  );

  releaseSearch();
});

test("movie detail modal search error", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());
  await authenticatedPage.route("**/chill.v4.UserService/Search", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(errorResponse()),
    });
  });

  await authenticatedPage.goto("/movies");
  await authenticatedPage.locator('[data-slot="poster-card"]').first().click();

  const dialog = authenticatedPage.getByRole("dialog", { name: "Synthetic Feature Alpha details" });
  await expect(
    dialog.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expect(dialog).toHaveScreenshot(
    "movie-detail-modal-search-error.png",
    testInfo.project.name.startsWith("mobile") ? mobileDrawerVisualOptions : visualOptions,
  );
});

test("tv show detail modal loading", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(
    defaultMethods({
      GetTVShows: tvShowsResponse(tvShows),
    }),
  );

  let releaseDetail: () => void = () => {};
  const delayedDetail = new Promise<void>((resolve) => {
    releaseDetail = resolve;
  });
  const detailRequested = new Promise<void>((resolve) => {
    void authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
      resolve();
      await delayedDetail;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tvShowDetailResponse(
            tvShowDetail({
              imdbId: tvShows[0].imdbId,
              title: tvShows[0].title,
              year: tvShows[0].year,
              posterUrl: tvShows[0].posterUrl,
              rating: tvShows[0].rating,
              genres: ["Drama", "Mystery"],
            }),
            [
              tvShowSeason({ seasonNumber: 1, name: "Season 1", episodeCount: 2 }),
              tvShowSeason({ seasonNumber: 8, name: "Season 8", episodeCount: 2 }),
            ],
          ),
        ),
      });
    });
  });

  await authenticatedPage.route("**/chill.v4.UserService/GetTVShowSeason", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        tvShowSeasonResponse(
          tvShows[0].imdbId,
          8,
          tvShowSeason({ seasonNumber: 8, name: "Season 8", episodeCount: 2 }),
          [
            tvShowEpisode({ seasonNumber: 8, episodeNumber: 1, name: "Eighth Signal" }),
            tvShowEpisode({ seasonNumber: 8, episodeNumber: 2, name: "Late Return" }),
          ],
        ),
      ),
    });
  });

  await authenticatedPage.route(
    "**/chill.v4.UserService/GetTVShowSeasonDownloads",
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tvShowSeasonDownloadsResponse(
            tvShowDownload({
              title: "Synthetic.Show.Gamma.S08.2160p.WEB-DL.x265-FIXTURE",
              seasonNumber: 8,
              episodeNumber: undefined,
            }),
            [],
          ),
        ),
      });
    },
  );

  await authenticatedPage.goto(`/tv-shows/${tvShows[0].imdbId}?season=8`);
  await detailRequested;

  const dialog = authenticatedPage.getByRole("dialog", { name: "Synthetic Show Gamma" });
  await expect(dialog.locator("[data-detail-modal-body]")).toBeVisible();
  await expect(dialog).toHaveScreenshot(
    "tv-show-detail-modal-loading.png",
    testInfo.project.name.startsWith("mobile") ? mobileDrawerVisualOptions : visualOptions,
  );

  releaseDetail();
});

test("tv show detail modal error", async ({ authenticatedPage, mockRpc }, testInfo) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(
    defaultMethods({
      GetTVShows: tvShowsResponse(tvShows),
      GetTVShowDetail: tvShowDetailResponse(
        tvShowDetail({
          imdbId: tvShows[0].imdbId,
          title: tvShows[0].title,
          year: tvShows[0].year,
          posterUrl: tvShows[0].posterUrl,
          rating: tvShows[0].rating,
          genres: ["Drama", "Mystery"],
        }),
        [tvShowSeason({ seasonNumber: 1, name: "Season 1" })],
      ),
    }),
  );
  await authenticatedPage.route("**/chill.v4.UserService/GetTVShowSeason", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(errorResponse()),
    });
  });

  await authenticatedPage.goto("/tv-shows");
  await authenticatedPage.locator('[data-slot="poster-card"]').first().click();

  const dialog = authenticatedPage.getByRole("dialog", { name: "Synthetic Show Gamma" });
  await expect(
    dialog.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expect(dialog).toHaveScreenshot(
    "tv-show-detail-modal-error.png",
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
  await expect(authenticatedPage.getByText("Search preferences")).toBeVisible();
  await expect(authenticatedPage).toHaveScreenshot("settings-modal.png", visualOptions);
});

test("settings provider error", async ({ authenticatedPage, mockRpc }) => {
  await freezeVisualClock(authenticatedPage);
  await mockRpc(defaultMethods());
  await authenticatedPage.route("**/chill.v4.UserService/GetDownloadFolder", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(errorResponse()),
    });
  });

  await authenticatedPage.goto("/movies");
  await authenticatedPage.getByRole("button", { name: "settings" }).click();

  await expect(authenticatedPage.locator('[data-page="settings"]')).toBeVisible();
  await expect(
    authenticatedPage.getByText("Service temporarily unavailable. Please try again shortly."),
  ).toBeVisible({ timeout: 5000 });
  await expect(authenticatedPage).toHaveScreenshot("settings-provider-error.png", visualOptions);
});
