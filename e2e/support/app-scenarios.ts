import {
  MoviesSource,
  SearchResultDisplayBehavior,
} from "@chill-institute/contracts/chill/v4/api_pb";
import type { Page } from "@playwright/test";

import {
  downloadFolderResponse,
  folderResponse,
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
} from "./seeds";

export const scenarioMovies = [
  movie({
    id: "m1",
    title: "Synthetic Feature Alpha",
    titlePretty: "Synthetic Feature Alpha",
    year: 2010,
    rating: 8.8,
    genres: ["Science Fiction", "Action"],
    overview:
      "A field team follows a strange signal through an abandoned relay station and finds more than telemetry.",
    posterUrl: "/test/poster.svg",
    backdropUrl: "/test/backdrop.svg",
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

export const scenarioShows = [
  tvShow({
    imdbId: "tt9000003",
    title: "Synthetic Show Gamma",
    year: 2025,
    rating: 8.5,
    posterUrl: "/test/poster.svg",
  }),
];

export const scenarioEpisodes = [
  tvShowEpisode({ seasonNumber: 1, episodeNumber: 1, name: "Pilot" }),
  tvShowEpisode({ seasonNumber: 1, episodeNumber: 2, name: "Second Signal" }),
];

export function appScenarioMethods(overrides?: Record<string, unknown>) {
  return {
    GetUserSettings: userSettings({
      searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
    }),
    GetMovies: moviesResponse(scenarioMovies),
    GetTVShows: tvShowsResponse(scenarioShows),
    GetIndexers: indexersResponse([
      indexer({ id: "tracker-one", name: "Tracker One" }),
      indexer({ id: "tracker-two", name: "Tracker Two" }),
    ]),
    GetUserProfile: {
      userId: "quality-user",
      username: "quality",
      avatarUrl: "",
      email: "quality@example.test",
    },
    GetDownloadFolder: downloadFolderResponse(userFile({ id: 0n, name: "your files" })),
    GetFolder: folderResponse(userFile({ id: 0n, name: "your files" }), [
      userFile({ id: 1n, name: "Movies" }),
      userFile({ id: 2n, name: "TV Shows" }),
      userFile({ id: 3n, name: "Documentaries" }),
    ]),
    Search: searchResponse("Synthetic Feature Alpha 2010", scenarioSearchResults()),
    GetTVShowDetail: tvShowDetailResponse(
      tvShowDetail({
        imdbId: scenarioShows[0].imdbId,
        title: scenarioShows[0].title,
        year: scenarioShows[0].year,
        posterUrl: scenarioShows[0].posterUrl,
        backdropUrl: "/test/backdrop.svg",
        rating: scenarioShows[0].rating,
        overview:
          "A contained mystery follows a crew trying to keep its signal alive under pressure.",
        genres: ["Drama", "Mystery"],
      }),
      [tvShowSeason({ seasonNumber: 1, name: "Season 1", episodeCount: 2 })],
    ),
    GetTVShowSeason: tvShowSeasonResponse(
      scenarioShows[0].imdbId,
      1,
      tvShowSeason({ seasonNumber: 1, name: "Season 1", episodeCount: 2 }),
      scenarioEpisodes,
    ),
    GetTVShowSeasonDownloads: tvShowSeasonDownloadsResponse(
      tvShowDownload({
        title: "Synthetic.Show.Gamma.S01.2160p.WEB-DL.x265-GROUP",
        episodeNumber: undefined,
      }),
      scenarioEpisodes.map((episode) => ({
        episodeNumber: episode.episodeNumber,
        searchQuery: `Synthetic Show Gamma S01E${String(episode.episodeNumber).padStart(2, "0")}`,
        download: tvShowDownload({
          title: `Synthetic.Show.Gamma.S01E${String(episode.episodeNumber).padStart(2, "0")}.1080p.WEBRip.x265-GROUP`,
          episodeNumber: episode.episodeNumber,
        }),
      })),
    ),
    ...overrides,
  };
}

export function scenarioSearchResults() {
  return [
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
  ];
}

export function scenarioErrorResponse(
  message = "Service temporarily unavailable. Please try again shortly.",
) {
  return {
    code: "unavailable",
    message,
  };
}

export async function openMovieDetail(page: Page) {
  await page.goto("/movies");
  await page.getByText("Synthetic Feature Alpha").waitFor();
  await page.locator('[data-slot="poster-card"]').first().click();
  await page.getByText("Synthetic.Feature.Alpha.2010.1080p.BluRay.x264-FIXTURE").waitFor();
}

export async function openTVShowDetail(page: Page) {
  await page.goto("/tv-shows");
  await page.getByText("Synthetic Show Gamma").waitFor();
  await page.locator('[data-slot="poster-card"]').first().click();
  await page.getByText("Pilot").waitFor();
}

export async function openSettingsFolderPicker(page: Page) {
  await page.goto("/settings");
  await page.getByText("Search settings").waitFor();
  await page.getByRole("button", { name: "change" }).click();
  await page.getByRole("dialog").waitFor();
}
