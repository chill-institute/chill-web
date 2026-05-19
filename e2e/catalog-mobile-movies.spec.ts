import { test, expect } from "./support/fixtures";
import type { Page } from "@playwright/test";
import {
  movie,
  moviesResponse,
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
];

const manyMovieResults = Array.from({ length: 20 }, (_, index) => {
  const resultNumber = index + 1;
  const resolution = resultNumber <= 16 ? "1080p" : "720p";
  return searchResult({
    id: `sr-${resultNumber}`,
    title: `Aurora Protocol.2010.${resolution}.BluRay.x265-Part${String(resultNumber).padStart(2, "0")}`,
    indexer: "YTS",
    link: `magnet:?xt=urn:btih:aurora-${resultNumber}`,
    seeders: BigInt(200 - index),
    peers: BigInt(240 - index),
    size: BigInt(1_000_000_000 + resultNumber),
    source: "yts",
    uploadedAt: `2026-04-${String(resultNumber).padStart(2, "0")}T00:00:00Z`,
  });
});

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

test.describe("mobile movies", () => {
  test("movie detail results scroll and filters keep their selected value", async ({
    authenticatedPage,
    mockRpc,
  }) => {
    await mockRpc(
      homeMethods({
        Search: searchResponse("Aurora Protocol 2010", manyMovieResults),
      }),
    );

    await authenticatedPage.goto("/movies");
    await openFirstMovieModal(authenticatedPage);

    const scrollArea = authenticatedPage.locator("[data-movie-detail-scroll]");
    const resultsList = authenticatedPage.getByRole("list", { name: "Torrent results list" });
    const resultItems = resultsList.getByRole("listitem");

    await expect(resultItems).toHaveCount(20);
    await expect(resultItems.first()).toContainText("Part01");

    const scrollState = await scrollArea.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return {
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        scrollTop: element.scrollTop,
      };
    });

    expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
    expect(scrollState.scrollTop).toBeGreaterThan(0);
    await expect(resultItems.last()).toContainText("Part20");
    await expect(resultItems.last()).toBeVisible();

    await scrollArea.evaluate((element) => {
      element.scrollTop = 0;
    });

    const resolutionSelect = authenticatedPage.getByRole("combobox", { name: "Resolution" });
    await expect(resolutionSelect).toBeVisible();
    await resolutionSelect.selectOption("1080p");

    await expect(resolutionSelect).toHaveValue("1080p");
    await expect(resultItems).toHaveCount(16);
    await expect(resultItems.last()).toContainText("Part16");
    await expect(authenticatedPage.getByText("Part17")).not.toBeVisible();
  });
});
