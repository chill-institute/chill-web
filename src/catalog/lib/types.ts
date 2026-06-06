import { create } from "@bufbuild/protobuf";
import { CATALOG_SETTINGS_FALLBACKS, withUserSettingsDefaults } from "@/api/settings-defaults";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  MoviesSource,
  TVShowsSource,
  TVShowStatus,
  type CatalogSettings,
  type DownloadSettings,
  type Movie,
  type SearchResult,
  type TVShow,
  type UserSettings,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

export { TVShowStatus };

export type { Movie, SearchResult, TVShow, UserSettings };

export type CatalogAppSettings = Omit<CatalogSettings, "$typeName"> & {
  download: Omit<DownloadSettings, "$typeName">;
};

type CatalogAppSettingsDefaults = Omit<CatalogSettings, "$typeName">;

export const moviesSources = [
  MoviesSource.ROTTEN_TOMATOES,
  MoviesSource.IMDB_MOVIEMETER,
  MoviesSource.YTS,
  MoviesSource.TRAKT,
  MoviesSource.IMDB_TOP_250,
] as const;

export function parseMoviesSource(value: string): MoviesSource | undefined {
  const numeric = Number(value);
  return moviesSources.find((source) => source === numeric);
}

export const moviesSourceLabels: Record<MoviesSource, string> = {
  [MoviesSource.UNSPECIFIED]: "IMDb Moviemeter",
  [MoviesSource.IMDB_MOVIEMETER]: "IMDb Moviemeter",
  [MoviesSource.IMDB_TOP_250]: "IMDb Top 250",
  [MoviesSource.YTS]: "YTS",
  [MoviesSource.ROTTEN_TOMATOES]: "Rotten Tomatoes",
  [MoviesSource.TRAKT]: "Trakt",
};

export const tvShowsSources = [
  TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS,
  TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
  TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
  TVShowsSource.TV_SHOWS_SOURCE_APPLE_TV_PLUS,
  TVShowsSource.TV_SHOWS_SOURCE_PRIME_VIDEO,
  TVShowsSource.TV_SHOWS_SOURCE_DISNEY_PLUS,
  TVShowsSource.TV_SHOWS_SOURCE_HULU,
  TVShowsSource.TV_SHOWS_SOURCE_PARAMOUNT_PLUS,
  TVShowsSource.TV_SHOWS_SOURCE_AMC_PLUS,
  TVShowsSource.TV_SHOWS_SOURCE_PEACOCK,
] as const;

export function parseTVShowsSource(value: string): TVShowsSource | undefined {
  const numeric = Number(value);
  return tvShowsSources.find((source) => source === numeric);
}

export function getTVShowsSourceLabel(source: TVShowsSource): string {
  switch (source) {
    case TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS:
      return "All providers";
    case TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX:
      return "HBO Max";
    case TVShowsSource.TV_SHOWS_SOURCE_APPLE_TV_PLUS:
      return "Apple TV+";
    case TVShowsSource.TV_SHOWS_SOURCE_PRIME_VIDEO:
      return "Prime Video";
    case TVShowsSource.TV_SHOWS_SOURCE_DISNEY_PLUS:
      return "Disney+";
    case TVShowsSource.TV_SHOWS_SOURCE_HULU:
      return "Hulu";
    case TVShowsSource.TV_SHOWS_SOURCE_PARAMOUNT_PLUS:
      return "Paramount+";
    case TVShowsSource.TV_SHOWS_SOURCE_AMC_PLUS:
      return "AMC+";
    case TVShowsSource.TV_SHOWS_SOURCE_PEACOCK:
      return "Peacock";
    case TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED:
    case TVShowsSource.TV_SHOWS_SOURCE_NETFLIX:
    default:
      return "Netflix";
  }
}

export function getTVShowStatusLabel(status: TVShowStatus): string {
  switch (status) {
    case TVShowStatus.TV_SHOW_STATUS_RETURNING:
      return "Returning";
    case TVShowStatus.TV_SHOW_STATUS_ENDED:
      return "Ended";
    case TVShowStatus.TV_SHOW_STATUS_CANCELED:
      return "Canceled";
    case TVShowStatus.TV_SHOW_STATUS_IN_PRODUCTION:
      return "In production";
    case TVShowStatus.TV_SHOW_STATUS_PLANNED:
      return "Planned";
    case TVShowStatus.TV_SHOW_STATUS_UNSPECIFIED:
    default:
      return "Unknown";
  }
}

const defaultUserSettings: CatalogAppSettingsDefaults = {
  moviesSource: CATALOG_SETTINGS_FALLBACKS.moviesSource,
  tvShowsSource: CATALOG_SETTINGS_FALLBACKS.tvShowsSource,
};

export function toCatalogAppSettings(settings: UserSettings): CatalogAppSettings {
  const normalized = withUserSettingsDefaults(settings);
  return {
    ...defaultUserSettings,
    ...normalized.catalog,
    download: {
      folderId: normalized.download?.folderId,
    },
  };
}

export function applyCatalogAppSettingsPatch(
  settings: UserSettings,
  patch: Partial<CatalogAppSettings>,
): UserSettings {
  const { download, ...catalogPatch } = patch;
  const current = toCatalogAppSettings(settings);
  const next = create(UserSettingsSchema, {
    ...settings,
    catalog: create(CatalogSettingsSchema, {
      moviesSource: current.moviesSource,
      tvShowsSource: current.tvShowsSource,
      ...catalogPatch,
    }),
  });
  if (download !== undefined || settings.download !== undefined) {
    next.download = create(DownloadSettingsSchema, {
      folderId: download?.folderId ?? settings.download?.folderId,
    });
  }
  return next;
}
