import { test, expect } from "./support/fixtures";
import { create } from "@bufbuild/protobuf";
import type { Page } from "@playwright/test";
import {
  CodecFilter,
  MoviesSource,
  ReleaseInfoSchema,
  ResolutionFilter,
} from "@chill-institute/contracts/chill/v4/api_pb";
import {
  movie,
  moviesResponse,
  moviesResponseForSource,
  searchResponse,
  searchResult,
  tvShowsResponse,
  userSettings,
} from "./support/seeds";

const movies = [
  movie({
    id: "m1",
    title: "Aurora Protocol",
    titlePretty: "Aurora Protocol",
    year: 2010,
    rating: 8.8,
    genres: ["Science Fiction", "Action"],
    link: "magnet:?xt=urn:btih:aurora",
    posterUrl: "/test/poster.svg",
  }),
  movie({
    id: "m2",
    title: "Signal Orchard",
    titlePretty: "Signal Orchard",
    year: 2014,
    rating: 8.7,
    link: "magnet:?xt=urn:btih:signalOrchard",
    posterUrl: "/test/poster.svg",
  }),
];

const ytsMovies = [
  movie({
    id: "y1",
    title: "Night Courier",
    titlePretty: "Night Courier",
    year: 2011,
    rating: 7.6,
    link: "magnet:?xt=urn:btih:night-courier",
    posterUrl: "/test/poster.svg",
    source: MoviesSource.YTS,
  }),
];

const auroraSearchResults = [
  searchResult({
    id: "sr1",
    title: "Aurora Protocol.2010.1080p.BluRay.x264",
    indexer: "YTS",
    link: "magnet:?xt=urn:btih:aurora1080",
    seeders: 200n,
    peers: 240n,
    size: 2147483648n,
    source: "yts",
    uploadedAt: "2026-04-01T00:00:00Z",
    releaseInfo: create(ReleaseInfoSchema, {
      resolution: "1080p",
      codec: "H264",
    }),
  }),
  searchResult({
    id: "sr2",
    title: "Aurora Protocol.2010.2160p.WEB-DL.x265",
    indexer: "RARBG",
    link: "magnet:?xt=urn:btih:aurora2160",
    seeders: 80n,
    peers: 120n,
    size: 8589934592n,
    source: "rarbg",
    uploadedAt: "2026-03-20T00:00:00Z",
  }),
  searchResult({
    id: "sr3",
    title: "Aurora Protocol.2010.720p.BluRay.x265",
    indexer: "EZTV",
    link: "magnet:?xt=urn:btih:aurora720",
    seeders: 120n,
    peers: 170n,
    size: 1610612736n,
    source: "eztv",
    uploadedAt: "2026-04-09T00:00:00Z",
  }),
];

const homeMethods = (overrides?: Record<string, unknown>) => ({
  GetUserSettings: userSettings(),
  GetMovies: moviesResponse(movies),
  GetTVShows: tvShowsResponse([]),
  ...overrides,
});

async function openFirstMovieModal(page: Page) {
  const firstCard = page.locator('[data-slot="poster-card"]').first();
  await expect(firstCard).toBeVisible();
  await firstCard.click();
}

test.describe("movies", () => {
  test("renders movie cards", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      homeMethods({
        GetUserSettings: userSettings({}),
      }),
    );

    await authenticatedPage.goto("/movies");

    const articles = authenticatedPage.locator('[data-slot="poster-card"]');
    await expect(articles).toHaveCount(2);
    await expect(authenticatedPage.locator('[data-slot="poster-card"] img')).toHaveCount(2);
    await expect(articles.nth(0)).toContainText("Aurora Protocol");
    await expect(articles.nth(1)).toContainText("Signal Orchard");
  });

  test("empty state", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      homeMethods({
        GetMovies: moviesResponse([]),
      }),
    );

    await authenticatedPage.goto("/movies");

    await expect(authenticatedPage.getByText("Couldn't fetch any movies")).toBeVisible({
      timeout: 5000,
    });
  });

  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/movies");
    await page.waitForURL("**/sign-in**");
    expect(page.url()).toContain("/sign-in");
  });

  test("redirects stale tokens to sign-in with the current movies callback", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ code: "unauthenticated", message: "expired" }),
      });
    });

    await authenticatedPage.goto("/movies?source=1");
    await authenticatedPage.waitForURL("**/sign-in**");

    const url = new URL(authenticatedPage.url());
    expect(url.pathname).toBe("/sign-in");
    expect(url.searchParams.get("error")).toBe("SessionExpired");
    expect(url.searchParams.get("callbackUrl")).toBe("/movies?source=1");
  });

  test("clicking a movie card opens the detail modal and shows torrent results", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      homeMethods({
        Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
      }),
    );

    await authenticatedPage.goto("/movies");
    await openFirstMovieModal(authenticatedPage);
    const movieDialog = authenticatedPage.getByRole("dialog", {
      name: "Aurora Protocol details",
    });

    await expect(movieDialog.getByText("Aurora Protocol.2010.1080p.BluRay.x264")).toBeVisible();
    await expect(movieDialog.getByText("Science Fiction")).toBeVisible();
    await expect(movieDialog.getByText("Action")).toBeVisible();
    await expect(movieDialog.getByLabel("Resolution")).toBeVisible();
    await expect(movieDialog.getByLabel("Codec")).toBeVisible();
    await expect(movieDialog.getByLabel("Sort", { exact: true })).toBeVisible();
    const filterSelectWrappers = movieDialog.locator('[data-slot="native-select-wrapper"]');
    await expect(filterSelectWrappers).toHaveCount(3);
    const filterBoxes = await Promise.all(
      Array.from({ length: 3 }, (_, index) => filterSelectWrappers.nth(index).boundingBox()),
    );
    for (const filterBox of filterBoxes) {
      if (filterBox === null) throw new Error("Expected filter select to have a box");
      expect(filterBox.width).toBeGreaterThan(80);
      expect(filterBox.width).toBeLessThanOrEqual(160);
    }
    await expect(
      movieDialog.getByRole("button", { name: /send to put\.io/i }).last(),
    ).toBeVisible();
  });

  test("movie modal filters results and updates result order when sort changes", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      homeMethods({
        Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
      }),
    );

    await authenticatedPage.goto("/movies");
    await openFirstMovieModal(authenticatedPage);

    const pickFromSelect = async (label: string, optionLabel: string) => {
      await authenticatedPage.getByRole("combobox", { name: label }).selectOption({
        label: optionLabel,
      });
    };

    const resultsList = authenticatedPage.getByRole("list", { name: "Torrent results list" });
    const resultItems = resultsList.getByRole("listitem");

    await expect(resultItems).toHaveCount(3);
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.1080p.BluRay.x264");

    await pickFromSelect("Resolution", "2160p");
    await expect(resultItems).toHaveCount(1);
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.2160p.WEB-DL.x265");

    await pickFromSelect("Resolution", "all resolutions");
    await pickFromSelect("Codec", "x265");
    await expect(resultItems).toHaveCount(2);
    await expect(resultsList).not.toContainText("Aurora Protocol.2010.1080p.BluRay.x264");

    await pickFromSelect("Codec", "x264");
    await expect(resultItems).toHaveCount(1);
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.1080p.BluRay.x264");

    await pickFromSelect("Codec", "all codecs");
    await pickFromSelect("Sort", "newest first");
    await expect(resultItems).toHaveCount(3);
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.720p.BluRay.x265");

    await pickFromSelect("Sort", "largest size");
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.2160p.WEB-DL.x265");
  });

  test("movie modal applies saved filters when full settings replace cached catalog settings", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      homeMethods({
        Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
      }),
    );

    await authenticatedPage.addInitScript(
      (cachedSettings) => {
        window.localStorage.setItem("chill.catalog.settings.v1", cachedSettings);
      },
      JSON.stringify({
        catalog: {
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
          tvShowsSource: 1,
        },
        download: {},
      }),
    );

    let releaseSettings: (() => void) | undefined;
    const settingsRequested = new Promise<void>((resolve) => {
      void authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
        resolve();
        await new Promise<void>((release) => {
          releaseSettings = release;
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            userSettings({
              codecFilters: [CodecFilter.X265],
              rememberQuickFilters: true,
              resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
            }),
          ),
        });
      });
    });

    await authenticatedPage.goto("/movies/m1");
    await settingsRequested;

    const movieDialog = authenticatedPage.getByRole("dialog", {
      name: "Aurora Protocol details",
    });
    await expect(movieDialog).toBeVisible({ timeout: 3000 });
    await expect(movieDialog.getByRole("combobox", { name: "Resolution" })).toHaveValue("all");

    releaseSettings?.();

    await expect(movieDialog.getByRole("combobox", { name: "Resolution" })).toHaveValue("2160p");
    await expect(movieDialog.getByRole("combobox", { name: "Codec" })).toHaveValue("x265");
    const resultItems = movieDialog
      .getByRole("list", { name: "Torrent results list" })
      .getByRole("listitem");
    await expect(resultItems).toHaveCount(1);
    await expect(resultItems.first()).toContainText("Aurora Protocol.2010.2160p.WEB-DL.x265");
  });

  test("movie modal ignores saved filters when quick-filter remembering is disabled", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      homeMethods({
        Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
      }),
    );

    await authenticatedPage.addInitScript(
      (cachedSettings) => {
        window.localStorage.setItem("chill.catalog.settings.v1", cachedSettings);
      },
      JSON.stringify({
        catalog: {
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
          tvShowsSource: 1,
        },
        download: {},
      }),
    );

    let releaseSettings: (() => void) | undefined;
    const settingsRequested = new Promise<void>((resolve) => {
      void authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
        resolve();
        await new Promise<void>((release) => {
          releaseSettings = release;
        });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            userSettings({
              codecFilters: [CodecFilter.X265],
              rememberQuickFilters: false,
              resolutionFilters: [ResolutionFilter.RESOLUTION_FILTER_2160P],
            }),
          ),
        });
      });
    });

    await authenticatedPage.goto("/movies/m1");
    await settingsRequested;

    const movieDialog = authenticatedPage.getByRole("dialog", {
      name: "Aurora Protocol details",
    });
    await expect(movieDialog).toBeVisible({ timeout: 3000 });

    releaseSettings?.();

    await expect(movieDialog.getByRole("combobox", { name: "Resolution" })).toHaveValue("all");
    await expect(movieDialog.getByRole("combobox", { name: "Codec" })).toHaveValue("all");
    await expect(
      movieDialog.getByRole("list", { name: "Torrent results list" }).getByRole("listitem"),
    ).toHaveCount(3);
  });

  test("changing source does not re-show stale movies while waiting for the new source", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource = MoviesSource.IMDB_MOVIEMETER;

    await mockRpc(
      homeMethods({
        GetUserSettings: userSettings({
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
        }),
      }),
    );

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, ytsMovies)
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, movies);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: { catalog?: { moviesSource?: string | number } };
      };

      const nextSource = String(body.settings?.catalog?.moviesSource ?? "");
      if (nextSource.includes("YTS") || nextSource === String(MoviesSource.YTS)) {
        currentSource = MoviesSource.YTS;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            moviesSource: currentSource,
          }),
        ),
      });
    });

    await authenticatedPage.goto("/movies");

    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeVisible();

    await authenticatedPage
      .getByRole("combobox", { name: "Movie source" })
      .selectOption(String(MoviesSource.YTS));

    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeHidden({ timeout: 400 });
    await expect(authenticatedPage.getByText("Night Courier")).toBeVisible({ timeout: 2000 });
  });

  test("changing source only refetches movies once after save", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource = MoviesSource.IMDB_MOVIEMETER;
    let moviesRequests = 0;

    await mockRpc(
      homeMethods({
        GetUserSettings: userSettings({
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
        }),
      }),
    );

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      moviesRequests += 1;

      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, ytsMovies)
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, movies);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: { catalog?: { moviesSource?: string | number } };
      };

      const nextSource = String(body.settings?.catalog?.moviesSource ?? "");
      if (nextSource.includes("YTS") || nextSource === String(MoviesSource.YTS)) {
        currentSource = MoviesSource.YTS;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            moviesSource: currentSource,
          }),
        ),
      });
    });

    await authenticatedPage.goto("/movies");
    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeVisible();
    await expect.poll(() => moviesRequests).toBeGreaterThan(0);
    const initialMoviesRequests = moviesRequests;

    await authenticatedPage
      .getByRole("combobox", { name: "Movie source" })
      .selectOption(String(MoviesSource.YTS));

    await expect(authenticatedPage.getByText("Night Courier")).toBeVisible({ timeout: 2000 });
    await expect.poll(() => moviesRequests).toBe(initialMoviesRequests + 1);
  });

  test("waits for real settings before fetching movies from cached settings", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(homeMethods());

    await authenticatedPage.addInitScript(
      (cachedSettings) => {
        window.localStorage.setItem("chill.catalog.settings.v1", cachedSettings);
      },
      JSON.stringify({
        catalog: {
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
          tvShowsSource: 1,
        },
        download: {},
      }),
    );

    let allowSettingsResponses = false;
    const releaseSettingsResponses: Array<() => void> = [];
    let moviesRequests = 0;

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      if (!allowSettingsResponses) {
        await new Promise<void>((resolve) => {
          releaseSettingsResponses.push(resolve);
        });
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            moviesSource: MoviesSource.IMDB_MOVIEMETER,
          }),
        ),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      moviesRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(moviesResponse(movies)),
      });
    });

    await authenticatedPage.goto("/movies");

    await expect.poll(() => moviesRequests, { timeout: 300 }).toBe(0);

    allowSettingsResponses = true;
    for (const releaseSettingsResponse of releaseSettingsResponses) {
      releaseSettingsResponse();
    }

    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeVisible({ timeout: 2000 });
    await expect.poll(() => moviesRequests).toBeGreaterThan(0);
  });

  test("error state shows error message", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      homeMethods({
        GetUserSettings: userSettings(),
      }),
    );

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          code: "internal",
          message: "indexer is down",
        }),
      });
    });

    await authenticatedPage.goto("/movies");

    await expect(authenticatedPage.getByText("indexer is down")).toBeVisible({ timeout: 5000 });
  });
});
