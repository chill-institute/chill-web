import { test, expect } from "./support/fixtures";
import {
  movie,
  moviesResponse,
  moviesResponseForSource,
  searchResponse,
  searchResult,
  tvShow,
  tvShowsResponse,
  tvShowsResponseForSource,
  userSettings,
} from "./support/seeds";
import { MoviesSource, TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

const inception = movie({
  id: "m1",
  title: "Inception",
  titlePretty: "Inception",
  year: 2010,
  rating: 8.8,
  link: "magnet:?xt=urn:btih:inception",
  posterUrl: "/test/baggio.jpg",
});

const interstellar = movie({
  id: "m2",
  title: "Interstellar",
  titlePretty: "Interstellar",
  year: 2014,
  rating: 8.7,
  link: "magnet:?xt=urn:btih:interstellar",
  posterUrl: "/test/baggio.jpg",
});

const theRaid = movie({
  id: "y1",
  title: "The Raid",
  titlePretty: "The Raid",
  year: 2011,
  rating: 7.6,
  link: "magnet:?xt=urn:btih:raid",
  posterUrl: "/test/baggio.jpg",
  source: MoviesSource.YTS,
});

const thePitt = tvShow({
  imdbId: "tt31938062",
  title: "The Pitt",
  year: 2025,
  posterUrl: "/test/baggio.jpg",
  source: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
  networks: ["HBO Max"],
});

const inceptionSearchResults = [
  searchResult({
    id: "sr1",
    title: "Inception.2010.1080p.BluRay.x264",
    indexer: "YTS",
    link: "magnet:?xt=urn:btih:inception1080",
    seeders: 200n,
    peers: 240n,
    size: 2147483648n,
    source: "yts",
    uploadedAt: "2026-04-01T00:00:00Z",
  }),
];

test.describe("binge routing", () => {
  test("/ redirects to /movies by default", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true, showTvShows: true }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.goto("/");
    await authenticatedPage.waitForURL(/\/movies(\?|$)/);
    expect(new URL(authenticatedPage.url()).pathname).toBe("/movies");
  });

  test("/ honours readLastTab() and redirects to /tv-shows when stored", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true, showTvShows: true }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.addInitScript(() => {
      window.localStorage.setItem("binge.last_tab", "tv-shows");
    });
    await authenticatedPage.goto("/");
    await authenticatedPage.waitForURL(/\/tv-shows(\?|$)/);
    expect(new URL(authenticatedPage.url()).pathname).toBe("/tv-shows");
  });

  test("deep link /tv-shows lands on the tv tab", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true, showTvShows: true }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.goto("/tv-shows");
    await expect(authenticatedPage.getByRole("tab", { name: "tv shows" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("picking a sort updates the URL with the new sort param", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true }),
      GetMovies: moviesResponse([inception, interstellar]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("button", { name: "rating" }).click();
    await expect(authenticatedPage).toHaveURL(/sort=rating/);
  });

  test("picking a movie source updates the URL with the source param", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource: MoviesSource = MoviesSource.IMDB_MOVIEMETER;

    await mockRpc({
      GetUserSettings: userSettings({
        showMovies: true,
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [theRaid])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [inception]);
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
        body: JSON.stringify(userSettings({ showMovies: true, moviesSource: currentSource })),
      });
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("button", { name: "YTS" }).click();
    await expect(authenticatedPage).toHaveURL(/source=/, { timeout: 2000 });
  });

  test("deep linked movie source updates settings before rendering source-specific catalog", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource: MoviesSource = MoviesSource.IMDB_MOVIEMETER;

    await mockRpc({
      GetUserSettings: userSettings({
        showMovies: true,
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [theRaid])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [inception]);
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
        body: JSON.stringify(userSettings({ showMovies: true, moviesSource: currentSource })),
      });
    });

    await authenticatedPage.goto(`/movies?source=${MoviesSource.YTS}`);

    await expect(authenticatedPage.getByText("The Raid")).toBeVisible({ timeout: 3000 });
    await expect(authenticatedPage.getByText("Inception")).toBeHidden();
  });

  test("deep linked movie source waits for real settings before saving", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource: MoviesSource = MoviesSource.IMDB_MOVIEMETER;
    let allowSettingsResponse = false;
    const releaseSettingsResponses: Array<() => void> = [];
    const savedBodies: Array<{
      settings?: {
        catalog?: { moviesSource?: string | number };
        search?: { rememberQuickFilters?: boolean };
      };
    }> = [];

    await authenticatedPage.addInitScript(
      (cachedSettings) => {
        window.localStorage.setItem("chill.settings", cachedSettings);
      },
      JSON.stringify({
        codecFilters: [],
        disabledIndexerIds: [],
        filterNastyResults: false,
        filterResultsWithNoSeeders: false,
        otherFilters: [],
        rememberQuickFilters: false,
        resolutionFilters: [],
        searchResultDisplayBehavior: 1,
        searchResultTitleBehavior: 2,
        showMovies: true,
        showTvShows: true,
        sortBy: 2,
        sortDirection: 2,
        cardDisplayType: 1,
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    );

    await mockRpc({
      GetUserSettings: userSettings({
        showMovies: true,
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        rememberQuickFilters: true,
      }),
      GetMovies: moviesResponse([inception]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetUserSettings", async (route) => {
      if (!allowSettingsResponse) {
        await new Promise<void>((resolve) => {
          releaseSettingsResponses.push(resolve);
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            showMovies: true,
            moviesSource: MoviesSource.IMDB_MOVIEMETER,
            rememberQuickFilters: true,
          }),
        ),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [theRaid])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [inception]);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: {
          catalog?: { moviesSource?: string | number };
          search?: { rememberQuickFilters?: boolean };
        };
      };
      savedBodies.push(body);
      const nextSource = String(body.settings?.catalog?.moviesSource ?? "");
      if (nextSource.includes("YTS") || nextSource === String(MoviesSource.YTS)) {
        currentSource = MoviesSource.YTS;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            showMovies: true,
            moviesSource: currentSource,
            rememberQuickFilters: body.settings?.search?.rememberQuickFilters,
          }),
        ),
      });
    });

    await authenticatedPage.goto(`/movies?source=${MoviesSource.YTS}`);

    await expect.poll(() => savedBodies.length, { timeout: 300 }).toBe(0);

    allowSettingsResponse = true;
    for (const releaseSettingsResponse of releaseSettingsResponses) {
      releaseSettingsResponse();
    }

    await expect(authenticatedPage.getByText("The Raid")).toBeVisible({ timeout: 3000 });
    expect(savedBodies).toHaveLength(1);
    expect(savedBodies[0]?.settings?.search?.rememberQuickFilters).toBe(true);
  });

  test("clicking a movie card navigates to /movies/:id", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true }),
      GetMovies: moviesResponse([inception, interstellar]),
      GetTVShows: tvShowsResponse([]),
      Search: searchResponse("Inception 2010", inceptionSearchResults),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
    await authenticatedPage.waitForURL(/\/movies\/m1(\?|$)/);
    await expect(authenticatedPage.getByText("Inception.2010.1080p.BluRay.x264")).toBeVisible();
  });

  test("closing the modal pops back to /movies and keeps catalog visible", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings({ showMovies: true }),
      GetMovies: moviesResponse([inception, interstellar]),
      GetTVShows: tvShowsResponse([]),
      Search: searchResponse("Inception 2010", inceptionSearchResults),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
    await authenticatedPage.waitForURL(/\/movies\/m1(\?|$)/);

    await authenticatedPage.goBack();
    await authenticatedPage.waitForURL(/\/movies(\?|$)/);
    expect(new URL(authenticatedPage.url()).pathname).toBe("/movies");
    await expect(authenticatedPage.locator('[data-slot="poster-card"]').first()).toBeVisible();
  });

  test("opening a tv card preserves catalog search params", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings({
        showMovies: true,
        showTvShows: true,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
      GetMovies: moviesResponse([]),
      GetTVShows: tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, [thePitt]),
    });

    await authenticatedPage.goto(
      `/tv-shows?sort=rating&source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}`,
    );
    await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
    await authenticatedPage.waitForURL(/\/tv-shows\/tt31938062/);

    const url = new URL(authenticatedPage.url());
    expect(url.searchParams.get("sort")).toBe("rating");
    expect(url.searchParams.get("source")).toBe(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));
    expect(url.searchParams.get("season")).toBe("1");
  });
});
