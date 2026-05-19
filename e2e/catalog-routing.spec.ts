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

const aurora = movie({
  id: "m1",
  title: "Aurora Protocol",
  titlePretty: "Aurora Protocol",
  year: 2010,
  rating: 8.8,
  link: "magnet:?xt=urn:btih:aurora",
  posterUrl: "/test/poster.svg",
});

const signalOrchard = movie({
  id: "m2",
  title: "Signal Orchard",
  titlePretty: "Signal Orchard",
  year: 2014,
  rating: 8.7,
  link: "magnet:?xt=urn:btih:signalOrchard",
  posterUrl: "/test/poster.svg",
});

const nightCourier = movie({
  id: "y1",
  title: "Night Courier",
  titlePretty: "Night Courier",
  year: 2011,
  rating: 7.6,
  link: "magnet:?xt=urn:btih:night-courier",
  posterUrl: "/test/poster.svg",
  source: MoviesSource.YTS,
});

const harborWard = tvShow({
  imdbId: "tt9000003",
  title: "Harbor Ward",
  year: 2025,
  posterUrl: "/test/poster.svg",
  source: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
  networks: ["HBO Max"],
});

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
  }),
];

test.describe("catalog routing", () => {
  test("/ stays on the search home with the search tab active", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/");

    expect(new URL(authenticatedPage.url()).pathname).toBe("/");
    await expect(authenticatedPage.getByRole("tab", { name: "search" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(authenticatedPage.getByText("Welcome to The Institute")).toBeVisible();
  });

  test("deep link /tv-shows lands on the tv tab", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse([aurora]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.goto("/tv-shows");
    await expect(authenticatedPage.getByRole("tab", { name: "tv shows" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("picking a movie source updates the URL with the source param", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource: MoviesSource = MoviesSource.IMDB_MOVIEMETER;

    await mockRpc({
      GetUserSettings: userSettings({
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
      GetMovies: moviesResponse([aurora]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [nightCourier])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [aurora]);
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
        body: JSON.stringify(userSettings({ moviesSource: currentSource })),
      });
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage
      .getByRole("combobox", { name: "Movie source" })
      .selectOption(String(MoviesSource.YTS));
    await expect(authenticatedPage).toHaveURL(/source=/, { timeout: 2000 });
  });

  test("deep linked movie source updates settings before rendering source-specific catalog", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource: MoviesSource = MoviesSource.IMDB_MOVIEMETER;

    await mockRpc({
      GetUserSettings: userSettings({
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
      GetMovies: moviesResponse([aurora]),
      GetTVShows: tvShowsResponse([]),
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [nightCourier])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [aurora]);
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
        body: JSON.stringify(userSettings({ moviesSource: currentSource })),
      });
    });

    await authenticatedPage.goto(`/movies?source=${MoviesSource.YTS}`);

    await expect(authenticatedPage.getByText("Night Courier")).toBeVisible({ timeout: 3000 });
    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeHidden();
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
        window.localStorage.setItem("chill.catalog.settings.v1", cachedSettings);
      },
      JSON.stringify({
        catalog: {
          moviesSource: MoviesSource.IMDB_MOVIEMETER,
          tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
        },
        download: {},
      }),
    );

    await mockRpc({
      GetUserSettings: userSettings({
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        search: { rememberQuickFilters: true },
      }),
      GetMovies: moviesResponse([aurora]),
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
            moviesSource: MoviesSource.IMDB_MOVIEMETER,
            search: { rememberQuickFilters: true },
          }),
        ),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetMovies", async (route) => {
      const response =
        currentSource === MoviesSource.YTS
          ? moviesResponseForSource(MoviesSource.YTS, [nightCourier])
          : moviesResponseForSource(MoviesSource.IMDB_MOVIEMETER, [aurora]);
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
            moviesSource: currentSource,
            search: { rememberQuickFilters: body.settings?.search?.rememberQuickFilters },
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

    await expect(authenticatedPage.getByText("Night Courier")).toBeVisible({ timeout: 3000 });
    expect(savedBodies.length).toBeGreaterThan(0);
    expect(savedBodies.at(-1)?.settings?.search?.rememberQuickFilters).toBe(true);
  });

  test("clicking a movie card navigates to /movies/:id", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse([aurora, signalOrchard]),
      GetTVShows: tvShowsResponse([]),
      Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
    await authenticatedPage.waitForURL(/\/movies\/m1(\?|$)/);
    await expect(
      authenticatedPage.getByText("Aurora Protocol.2010.1080p.BluRay.x264"),
    ).toBeVisible();
  });

  test("closing the modal pops back to /movies and keeps catalog visible", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc({
      GetUserSettings: userSettings(),
      GetMovies: moviesResponse([aurora, signalOrchard]),
      GetTVShows: tvShowsResponse([]),
      Search: searchResponse("Aurora Protocol 2010", auroraSearchResults),
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
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
      GetMovies: moviesResponse([]),
      GetTVShows: tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, [harborWard]),
    });

    await authenticatedPage.goto(`/tv-shows?source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}`);
    await authenticatedPage.locator('[data-slot="poster-card"]').first().click();
    await authenticatedPage.waitForURL(/\/tv-shows\/tt9000003/);

    const url = new URL(authenticatedPage.url());
    expect(url.searchParams.get("source")).toBe(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));
    expect(url.searchParams.get("season")).toBe("1");
  });
});
