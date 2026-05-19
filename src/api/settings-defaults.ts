import { create } from "@bufbuild/protobuf";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  MoviesSource,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  SearchSettingsSchema,
  SortBy,
  SortDirection,
  TVShowsSource,
  type UserSettings,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

export const SEARCH_SETTINGS_FALLBACKS = {
  searchResultDisplayBehavior: SearchResultDisplayBehavior.FASTEST,
  searchResultTitleBehavior: SearchResultTitleBehavior.TEXT,
  sortBy: SortBy.SEEDERS,
  sortDirection: SortDirection.DESC,
} as const;

export const CATALOG_SETTINGS_FALLBACKS = {
  moviesSource: MoviesSource.IMDB_MOVIEMETER,
  tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
} as const;

export function withSearchSettingsDefaults(settings: UserSettings): UserSettings {
  const search = settings.search;
  return create(UserSettingsSchema, {
    ...settings,
    search: create(SearchSettingsSchema, {
      codecFilters: search?.codecFilters ?? [],
      disabledIndexerIds: search?.disabledIndexerIds ?? [],
      filterNastyResults: search?.filterNastyResults ?? true,
      filterResultsWithNoSeeders: search?.filterResultsWithNoSeeders ?? false,
      otherFilters: search?.otherFilters ?? [],
      rememberQuickFilters: search?.rememberQuickFilters ?? false,
      resolutionFilters: search?.resolutionFilters ?? [],
      searchResultDisplayBehavior:
        search?.searchResultDisplayBehavior === SearchResultDisplayBehavior.UNSPECIFIED ||
        search?.searchResultDisplayBehavior === undefined
          ? SEARCH_SETTINGS_FALLBACKS.searchResultDisplayBehavior
          : search.searchResultDisplayBehavior,
      searchResultTitleBehavior:
        search?.searchResultTitleBehavior === SearchResultTitleBehavior.UNSPECIFIED ||
        search?.searchResultTitleBehavior === undefined
          ? SEARCH_SETTINGS_FALLBACKS.searchResultTitleBehavior
          : search.searchResultTitleBehavior,
      sortBy:
        search?.sortBy === SortBy.UNSPECIFIED || search?.sortBy === undefined
          ? SEARCH_SETTINGS_FALLBACKS.sortBy
          : search.sortBy,
      sortDirection:
        search?.sortDirection === SortDirection.UNSPECIFIED || search?.sortDirection === undefined
          ? SEARCH_SETTINGS_FALLBACKS.sortDirection
          : search.sortDirection,
    }),
  });
}

export function withUserSettingsDefaults(settings: UserSettings): UserSettings {
  const withSearch = withSearchSettingsDefaults(settings);
  const catalog = withSearch.catalog;
  return create(UserSettingsSchema, {
    ...withSearch,
    catalog: create(CatalogSettingsSchema, {
      moviesSource:
        catalog?.moviesSource === MoviesSource.UNSPECIFIED || catalog?.moviesSource === undefined
          ? CATALOG_SETTINGS_FALLBACKS.moviesSource
          : catalog.moviesSource,
      tvShowsSource:
        catalog?.tvShowsSource === TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED ||
        catalog?.tvShowsSource === undefined
          ? CATALOG_SETTINGS_FALLBACKS.tvShowsSource
          : catalog.tvShowsSource,
    }),
    download: create(
      DownloadSettingsSchema,
      withSearch.download?.folderId === undefined ? {} : { folderId: withSearch.download.folderId },
    ),
  });
}
