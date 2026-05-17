import {
  CardDisplayType,
  MoviesSource,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SortBy,
  SortDirection,
  TVShowsSource,
  TVShowStatus,
  type Movie,
  type SearchResult,
  type TVShow,
  type UserSettings,
} from "@chill-institute/contracts/chill/v4/api_pb";

export { MoviesSource, TVShowsSource, TVShowStatus };

export type { Movie, SearchResult, TVShow, UserSettings };

export function normalizeBingeUserSettings(settings: UserSettings): UserSettings {
  return {
    ...settings,
    showMovies: true,
    showTvShows: true,
  };
}

type UserSettingsDefaults = Omit<UserSettings, "$typeName">;

export const moviesSources = [
  MoviesSource.IMDB_MOVIEMETER,
  MoviesSource.YTS,
  MoviesSource.ROTTEN_TOMATOES,
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
  TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
  TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
  TVShowsSource.TV_SHOWS_SOURCE_APPLE_TV_PLUS,
  TVShowsSource.TV_SHOWS_SOURCE_PRIME_VIDEO,
  TVShowsSource.TV_SHOWS_SOURCE_DISNEY_PLUS,
] as const;

export function parseTVShowsSource(value: string): TVShowsSource | undefined {
  const numeric = Number(value);
  return tvShowsSources.find((source) => source === numeric);
}

export function getTVShowsSourceLabel(source: TVShowsSource): string {
  switch (source) {
    case TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX:
      return "HBO Max";
    case TVShowsSource.TV_SHOWS_SOURCE_APPLE_TV_PLUS:
      return "Apple TV+";
    case TVShowsSource.TV_SHOWS_SOURCE_PRIME_VIDEO:
      return "Prime Video";
    case TVShowsSource.TV_SHOWS_SOURCE_DISNEY_PLUS:
      return "Disney+";
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

export const defaultUserSettings: UserSettingsDefaults = {
  codecFilters: [],
  disabledIndexerIds: [],
  filterNastyResults: true,
  filterResultsWithNoSeeders: false,
  otherFilters: [],
  rememberQuickFilters: false,
  resolutionFilters: [],
  searchResultDisplayBehavior: SearchResultDisplayBehavior.FASTEST,
  searchResultTitleBehavior: SearchResultTitleBehavior.TEXT,
  showMovies: true,
  showTvShows: true,
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
  cardDisplayType: CardDisplayType.EXPANDED,
  moviesSource: MoviesSource.IMDB_MOVIEMETER,
  tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
};
