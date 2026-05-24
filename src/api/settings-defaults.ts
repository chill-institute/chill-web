import { create, isFieldSet } from "@bufbuild/protobuf";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  MoviesSource,
  SearchResultDisplayBehavior,
  SearchResultTitleBehavior,
  type SearchSettings,
  SearchSettingsSchema,
  SortBy,
  SortDirection,
  type CatalogSettings,
  type DownloadSettings,
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

function mergeSaveSearchResponse(
  fallback: SearchSettings | undefined,
  response: SearchSettings | undefined,
): SearchSettings | undefined {
  if (!response) return fallback;
  return create(SearchSettingsSchema, {
    codecFilters: response.codecFilters.length > 0 ? response.codecFilters : fallback?.codecFilters,
    disabledIndexerIds:
      response.disabledIndexerIds.length > 0
        ? response.disabledIndexerIds
        : fallback?.disabledIndexerIds,
    filterNastyResults: mergeImplicitBool(
      fallback?.filterNastyResults,
      response,
      SearchSettingsSchema.field.filterNastyResults,
      response.filterNastyResults,
    ),
    filterResultsWithNoSeeders: mergeImplicitBool(
      fallback?.filterResultsWithNoSeeders,
      response,
      SearchSettingsSchema.field.filterResultsWithNoSeeders,
      response.filterResultsWithNoSeeders,
    ),
    otherFilters: response.otherFilters.length > 0 ? response.otherFilters : fallback?.otherFilters,
    rememberQuickFilters: mergeImplicitBool(
      fallback?.rememberQuickFilters,
      response,
      SearchSettingsSchema.field.rememberQuickFilters,
      response.rememberQuickFilters,
    ),
    resolutionFilters:
      response.resolutionFilters.length > 0
        ? response.resolutionFilters
        : fallback?.resolutionFilters,
    searchResultDisplayBehavior:
      response.searchResultDisplayBehavior === SearchResultDisplayBehavior.UNSPECIFIED
        ? fallback?.searchResultDisplayBehavior
        : response.searchResultDisplayBehavior,
    searchResultTitleBehavior:
      response.searchResultTitleBehavior === SearchResultTitleBehavior.UNSPECIFIED
        ? fallback?.searchResultTitleBehavior
        : response.searchResultTitleBehavior,
    sortBy: response.sortBy === SortBy.UNSPECIFIED ? fallback?.sortBy : response.sortBy,
    sortDirection:
      response.sortDirection === SortDirection.UNSPECIFIED
        ? fallback?.sortDirection
        : response.sortDirection,
  });
}

function mergeImplicitBool(
  fallback: boolean | undefined,
  response: SearchSettings,
  field: (typeof SearchSettingsSchema.field)["filterNastyResults"],
  value: boolean,
): boolean | undefined {
  return isFieldSet(response, field) ? value : fallback;
}

function mergeSaveCatalogResponse(
  fallback: CatalogSettings | undefined,
  response: CatalogSettings | undefined,
): CatalogSettings | undefined {
  if (!response) return fallback;
  return create(CatalogSettingsSchema, {
    moviesSource:
      response.moviesSource === MoviesSource.UNSPECIFIED
        ? fallback?.moviesSource
        : response.moviesSource,
    tvShowsSource:
      response.tvShowsSource === TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED
        ? fallback?.tvShowsSource
        : response.tvShowsSource,
  });
}

function mergeSaveDownloadResponse(
  fallback: DownloadSettings | undefined,
  response: DownloadSettings | undefined,
): DownloadSettings | undefined {
  if (!response) return fallback;
  return create(DownloadSettingsSchema, {
    folderId: response.folderId ?? fallback?.folderId,
  });
}

export function withSaveUserSettingsResponseDefaults({
  fallback,
  response,
}: {
  fallback: UserSettings;
  response: UserSettings;
}): UserSettings {
  const fallbackWithDefaults = withUserSettingsDefaults(fallback);
  const returnedSettings =
    response.search !== undefined ||
    response.catalog !== undefined ||
    response.download !== undefined;
  if (!returnedSettings) {
    return fallbackWithDefaults;
  }

  return withUserSettingsDefaults(
    create(UserSettingsSchema, {
      ...fallbackWithDefaults,
      search: mergeSaveSearchResponse(fallbackWithDefaults.search, response.search),
      catalog: mergeSaveCatalogResponse(fallbackWithDefaults.catalog, response.catalog),
      download: mergeSaveDownloadResponse(fallbackWithDefaults.download, response.download),
    }),
  );
}
