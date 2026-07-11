import { TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

import { expect, test } from "./support/fixtures";
import {
  expectNoExcessBottomSpace,
  expectStableBox,
  expectStablePosition,
  stableElementBox,
} from "./support/layout";
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

  test("tv source select updates the URL and refreshes the list", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    let saveCalls = 0;

    await mockRpc(homeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShows", async (route) => {
      const body = route.request().postDataJSON() as { source?: string | number };
      const requestedSource = String(body.source ?? "");
      const isHBO =
        requestedSource.includes("HBO") ||
        requestedSource === String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
      const response = isHBO
        ? tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows)
        : tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS, netflixShows);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    });

    await authenticatedPage.route("**/chill.v4.UserService/SaveUserSettings", async (route) => {
      saveCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(userSettings()),
      });
    });

    await authenticatedPage.goto("/movies");
    await authenticatedPage.getByRole("link", { name: "tv shows" }).click();

    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeVisible();

    await authenticatedPage
      .getByRole("combobox", { name: "TV source" })
      .selectOption(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));

    await expect(authenticatedPage).toHaveURL(
      new RegExp(`source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}`),
      { timeout: 2000 },
    );
    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeHidden({ timeout: 500 });
    await expect(authenticatedPage.getByText("Harbor Ward")).toBeVisible({ timeout: 2000 });
    expect(saveCalls).toBe(0);
  });

  test("tv source select does not render a mismatched source response", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(homeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShows", async (route) => {
      const body = route.request().postDataJSON() as { source?: string | number };
      const requestedSource = String(body.source ?? "");
      const isHBO =
        requestedSource.includes("HBO") ||
        requestedSource === String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          isHBO
            ? tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_NETFLIX, netflixShows)
            : tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS, netflixShows),
        ),
      });
    });

    await authenticatedPage.goto("/tv-shows");
    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeVisible();

    await authenticatedPage
      .getByRole("combobox", { name: "TV source" })
      .selectOption(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));

    await expect(authenticatedPage.getByText("Velvet Terminal")).toBeHidden({ timeout: 500 });
    await expect(authenticatedPage.getByText("Harbor Ward")).toBeHidden();
  });

  test("opening a selected-provider show keeps the provider selected while the modal loads", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(homeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShows", async (route) => {
      const body = route.request().postDataJSON() as { source?: string | number };
      const requestedSource = String(body.source ?? "");
      const isHBO =
        requestedSource.includes("HBO") ||
        requestedSource === String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          isHBO
            ? tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows)
            : tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS, hboShows),
        ),
      });
    });

    let releaseDetail: (() => void) | undefined;
    await authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
      await new Promise<void>((release) => {
        releaseDetail = release;
      });
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

    await authenticatedPage.goto("/tv-shows");
    await authenticatedPage
      .getByRole("combobox", { name: "TV source" })
      .selectOption(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));
    await authenticatedPage
      .locator('[data-slot="poster-card"]')
      .filter({ hasText: "Harbor Ward" })
      .first()
      .click();

    await authenticatedPage.waitForURL(/\/tv-shows\/tt9000003/);
    await expect(
      authenticatedPage.getByRole("combobox", { name: "TV source", includeHidden: true }),
    ).toHaveValue(String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX));
    expect(new URL(authenticatedPage.url()).searchParams.get("source")).toBe(
      String(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX),
    );

    releaseDetail?.();
  });

  test("tv detail does not use fallback show data from a mismatched source response", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(homeMethods());

    await authenticatedPage.route("**/chill.v4.UserService/GetTVShows", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_NETFLIX, [defaultShow]),
        ),
      });
    });

    let releaseDetail: (() => void) | undefined;
    const detailRequested = new Promise<void>((resolve) => {
      void authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
        resolve();
        await new Promise<void>((release) => {
          releaseDetail = release;
        });
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
    });

    await authenticatedPage.goto(
      `/tv-shows/${defaultShow.imdbId}?source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}&season=1`,
    );
    await detailRequested;

    await expect(authenticatedPage.getByRole("dialog", { name: "Harbor Ward" })).toHaveCount(0);

    releaseDetail?.();

    await expect(authenticatedPage.getByRole("dialog", { name: "Harbor Ward" })).toBeVisible({
      timeout: 3000,
    });
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

  for (const { name, viewport } of [
    { name: "desktop", viewport: { width: 1280, height: 720 } },
    { name: "mobile", viewport: { width: 390, height: 844 } },
  ]) {
    test(`tv detail keeps modal frame stable while details load on ${name}`, async ({
      authenticatedPage,
      mockRpc,
    }) => {
      await authenticatedPage.setViewportSize(viewport);
      await mockRpc(
        homeMethods({
          GetTVShows: tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows),
          GetTVShowSeason: tvShowSeasonResponse(
            defaultShow.imdbId,
            1,
            defaultSeasons[0],
            defaultEpisodes,
          ),
          GetTVShowSeasonDownloads: tvShowSeasonDownloadsResponse(
            tvShowDownload({
              title: "Harbor.Ward.S01.2160p.WEB-DL.x265-GROUP",
              seasonNumber: 1,
              episodeNumber: undefined,
            }),
            [],
          ),
        }),
      );

      let releaseDetail: () => void = () => {};
      const delayedDetail = new Promise<void>((resolve) => {
        releaseDetail = resolve;
      });
      await authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
        await delayedDetail;
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

      await authenticatedPage.goto(`/tv-shows?source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}`);
      await authenticatedPage
        .locator('[data-slot="poster-card"]')
        .filter({ hasText: "Harbor Ward" })
        .first()
        .click();

      const modal = authenticatedPage.getByRole("dialog", { name: "Harbor Ward" });
      const modalShell = modal.locator("[data-detail-modal-shell]");
      const modalBody = modal.locator("[data-detail-modal-body]");
      const beforeShell = await stableElementBox(modalShell);
      const beforeBody = await stableElementBox(modalBody);

      releaseDetail();
      await expect(modal.getByRole("tab", { name: "Season 1", exact: true })).toBeVisible();
      const afterShell = await stableElementBox(modalShell);
      const afterBody = await stableElementBox(modalBody);

      expectStablePosition(beforeShell, afterShell);
      expectStablePosition(beforeBody, afterBody);
    });

    test(`tv detail avoids excess bottom space while details load on ${name}`, async ({
      authenticatedPage,
      mockRpc,
    }) => {
      await authenticatedPage.setViewportSize(viewport);
      await mockRpc(
        homeMethods({
          GetTVShows: tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows),
          GetTVShowSeason: tvShowSeasonResponse(
            defaultShow.imdbId,
            8,
            tvShowSeason({ seasonNumber: 8, name: "Season 8", episodeCount: 2 }),
            defaultEpisodes.map((episode) => tvShowEpisode({ ...episode, seasonNumber: 8 })),
          ),
          GetTVShowSeasonDownloads: tvShowSeasonDownloadsResponse(undefined, []),
        }),
      );

      let releaseDetail: () => void = () => {};
      const delayedDetail = new Promise<void>((resolve) => {
        releaseDetail = resolve;
      });
      await authenticatedPage.route("**/chill.v4.UserService/GetTVShowDetail", async (route) => {
        await delayedDetail;
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
              [...defaultSeasons, tvShowSeason({ seasonNumber: 8, name: "Season 8" })],
            ),
          ),
        });
      });

      await authenticatedPage.goto(
        `/tv-shows?source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}&season=8`,
      );
      await authenticatedPage
        .locator('[data-slot="poster-card"]')
        .filter({ hasText: "Harbor Ward" })
        .first()
        .click();

      const modal = authenticatedPage.getByRole("dialog", { name: "Harbor Ward" });
      const modalBody = modal.locator("[data-detail-modal-body]");
      const modalBodyContent = modalBody.locator("> div").first();

      await expectNoExcessBottomSpace(modalBody, modalBodyContent);

      releaseDetail();
      await expect(modal.getByRole("tab", { name: "Season 8", exact: true })).toBeVisible();
      await expectNoExcessBottomSpace(modalBody, modalBodyContent);
    });

    test(`tv detail keeps IMDb link stable while downloads load on ${name}`, async ({
      authenticatedPage,
      mockRpc,
    }) => {
      await authenticatedPage.setViewportSize(viewport);
      await mockRpc(
        homeMethods({
          GetTVShows: tvShowsResponseForSource(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX, hboShows),
          GetTVShowDetail: tvShowDetailResponse(
            tvShowDetail({
              imdbId: defaultShow.imdbId,
              title: defaultShow.title,
              networks: defaultShow.networks,
            }),
            defaultSeasons,
          ),
          GetTVShowSeason: tvShowSeasonResponse(
            defaultShow.imdbId,
            1,
            defaultSeasons[0],
            defaultEpisodes,
          ),
        }),
      );

      let releaseDownloads: () => void = () => {};
      const delayedDownloads = new Promise<void>((resolve) => {
        releaseDownloads = resolve;
      });
      await authenticatedPage.route(
        "**/chill.v4.UserService/GetTVShowSeasonDownloads",
        async (route) => {
          await delayedDownloads;
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

      await authenticatedPage.goto(`/tv-shows?source=${TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX}`);
      await authenticatedPage
        .locator('[data-slot="poster-card"]')
        .filter({ hasText: "Harbor Ward" })
        .first()
        .click();

      const modal = authenticatedPage.getByRole("dialog", { name: "Harbor Ward" });
      await expect(modal.getByText("7:00 A.M.")).toBeVisible();
      const modalShell = modal.locator("[data-detail-modal-shell]");
      const modalBody = modal.locator("[data-detail-modal-body]");
      const imdbLink = modal.getByRole("link", { name: /IMDb/i });
      const beforeShell = await stableElementBox(modalShell);
      const beforeBody = await stableElementBox(modalBody);
      const beforeLink = await stableElementBox(imdbLink);

      releaseDownloads();
      await expect(modal.getByRole("button", { name: /send season to put.io/i })).toBeVisible();
      const afterShell = await stableElementBox(modalShell);
      const afterBody = await stableElementBox(modalBody);
      const afterLink = await stableElementBox(imdbLink);

      expectStablePosition(beforeShell, afterShell);
      expectStablePosition(beforeBody, afterBody);
      expectStableBox(beforeLink, afterLink);
    });
  }
});
