import { TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

import { expect, test } from "./support/fixtures";
import {
  movie,
  moviesResponse,
  tvShow,
  tvShowDetail,
  tvShowDetailResponse,
  tvShowDownload,
  tvShowEpisode,
  tvShowSeason,
  tvShowSeasonDownloadsResponse,
  tvShowSeasonResponse,
  tvShowsResponse,
  tvShowsResponseForSource,
  userSettings,
} from "./support/seeds";

const movies = [
  movie({
    id: "movie-1",
    title: "Aurora Protocol",
    titlePretty: "Aurora Protocol",
    year: 2010,
    posterUrl: "/test/poster.svg",
    link: "magnet:?xt=urn:btih:movie-1",
  }),
];

const netflixShows = [
  tvShow({
    imdbId: "tt9000002",
    title: "Velvet Terminal",
    year: 2024,
    source: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
    networks: ["Netflix"],
  }),
];

const hboShows = [
  tvShow({
    imdbId: "tt9000003",
    title: "Harbor Ward",
    year: 2025,
    source: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
    networks: ["HBO Max"],
  }),
];

const defaultShow = hboShows[0];
const defaultSeasons = [
  tvShowSeason({ seasonNumber: 1, name: "Season 1", episodeCount: 15 }),
  tvShowSeason({ seasonNumber: 2, name: "Season 2", episodeCount: 10, airDate: "2026-01-12" }),
];
const defaultEpisodes = [
  tvShowEpisode({ seasonNumber: 1, episodeNumber: 1, name: "7:00 A.M." }),
  tvShowEpisode({ seasonNumber: 1, episodeNumber: 2, name: "8:00 A.M.", airDate: "2025-01-16" }),
];

const homeMethods = (overrides?: Record<string, unknown>) => ({
  GetUserSettings: userSettings({
    tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
  }),
  GetMovies: moviesResponse(movies),
  GetTVShows: tvShowsResponse(netflixShows),
  ...overrides,
});

test.describe("tv shows home", () => {
  test("switching tabs swaps content", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      homeMethods({
        GetTVShows: tvShowsResponse(hboShows),
      }),
    );

    await authenticatedPage.goto("/movies");

    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeVisible();

    await authenticatedPage.getByRole("link", { name: "tv shows" }).click();

    await expect(authenticatedPage.getByText("Harbor Ward")).toBeVisible();
    await expect(authenticatedPage.getByText("Aurora Protocol")).toBeHidden();
  });

  test("tv source select saves the new source and refreshes the list", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let currentSource = TVShowsSource.TV_SHOWS_SOURCE_NETFLIX;

    await mockRpc(homeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShows", async (route) => {
      const response =
        currentSource === TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX
          ? tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows)
          : tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_NETFLIX, netflixShows);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      const body = route.request().postDataJSON() as {
        settings?: { catalog?: { tvShowsSource?: string | number } };
      };

      const nextSource = String(body.settings?.catalog?.tvShowsSource ?? "");
      if (
        nextSource.includes("HBO") ||
        nextSource === String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX)
      ) {
        currentSource = TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          userSettings({
            tvShowsSource: currentSource,
          }),
        ),
      });
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("link", { name: "tv shows" }).click();

    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeVisible();

    await authenticatedPage
      .getByRole("combobox", { name: "TV source" })
      .selectOption(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));

    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeHidden({ timeout: 500 });
    await expect(authenticatedPage.getByText("Harbor Ward")).toBeVisible({ timeout: 2000 });
  });

  test("opening a tv card shows live detail data", async ({ authenticatedPage, mockRpc }) => {
    await mockRpc(
      homeMethods({
        GetTVShows: tvShowsResponse(hboShows),
      }),
    );

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tvShowDetailResponse(
            tvShowDetail({
              imdbId: defaultShow.imdbId,
              title: defaultShow.title,
              networks: defaultShow.networks,
            }),
            defaultSeasons,
          ),
        ),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShowSeason", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tvShowSeasonResponse(defaultShow.imdbId, 1, defaultSeasons[0], defaultEpisodes),
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
                title: "Harbor.Ward.S01.2160p.WEB-DL.x265-GROUP",
                seasonNumber: 1,
                episodeNumber: undefined,
              }),
              defaultEpisodes.map((episode) => ({
                episodeNumber: episode.episodeNumber,
                searchQuery: `Harbor Ward S01E${String(episode.episodeNumber).padStart(2, "0")}`,
                download: tvShowDownload({
                  title: `Harbor.Ward.S01E${String(episode.episodeNumber).padStart(2, "0")}.1080p.WEBRip.x265-GROUP`,
                  seasonNumber: 1,
                  episodeNumber: episode.episodeNumber,
                }),
              })),
            ),
          ),
        });
      },
    );

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("link", { name: "tv shows" }).click();

    await authenticatedPage
      .locator('[data-slot="poster-card"]')
      .filter({ hasText: "Harbor Ward" })
      .first()
      .click();

    const modal = authenticatedPage.getByRole("dialog", { name: "Harbor Ward" });

    await expect(
      modal.getByRole("heading", { level: 2, name: "Harbor Ward" }).last(),
    ).toBeVisible();
    await expect(modal.getByRole("tab", { name: "Season 1", exact: true })).toBeVisible();
    await expect(modal.getByText("7:00 A.M.")).toBeVisible();
    await expect(modal.getByRole("button", { name: /send season to put.io/i })).toBeVisible();
  });
});
