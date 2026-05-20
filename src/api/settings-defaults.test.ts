import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vite-plus/test";
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
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import {
  CATALOG_SETTINGS_FALLBACKS,
  SEARCH_SETTINGS_FALLBACKS,
  withSaveUserSettingsResponseDefaults,
  withSearchSettingsDefaults,
  withUserSettingsDefaults,
} from "./settings-defaults";

function unspecifiedSettings() {
  return create(UserSettingsSchema, {
    search: create(SearchSettingsSchema, {
      searchResultDisplayBehavior: SearchResultDisplayBehavior.UNSPECIFIED,
      searchResultTitleBehavior: SearchResultTitleBehavior.UNSPECIFIED,
      sortBy: SortBy.UNSPECIFIED,
      sortDirection: SortDirection.UNSPECIFIED,
    }),
  });
}

describe("withSearchSettingsDefaults", () => {
  it("fills missing and UNSPECIFIED search fields with the fallback set", () => {
    const out = withSearchSettingsDefaults(unspecifiedSettings());

    expect(out.search?.searchResultDisplayBehavior).toBe(
      SEARCH_SETTINGS_FALLBACKS.searchResultDisplayBehavior,
    );
    expect(out.search?.searchResultTitleBehavior).toBe(
      SEARCH_SETTINGS_FALLBACKS.searchResultTitleBehavior,
    );
    expect(out.search?.sortBy).toBe(SEARCH_SETTINGS_FALLBACKS.sortBy);
    expect(out.search?.sortDirection).toBe(SEARCH_SETTINGS_FALLBACKS.sortDirection);
  });

  it("preserves explicit search enum values", () => {
    const explicit = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        searchResultDisplayBehavior: SearchResultDisplayBehavior.ALL,
        searchResultTitleBehavior: SearchResultTitleBehavior.LINK,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.ASC,
      }),
    });

    const out = withSearchSettingsDefaults(explicit);

    expect(out.search?.searchResultDisplayBehavior).toBe(SearchResultDisplayBehavior.ALL);
    expect(out.search?.searchResultTitleBehavior).toBe(SearchResultTitleBehavior.LINK);
    expect(out.search?.sortBy).toBe(SortBy.SIZE);
    expect(out.search?.sortDirection).toBe(SortDirection.ASC);
  });

  it("does not mutate the input proto", () => {
    const input = unspecifiedSettings();
    const before = input.search?.sortBy;

    withSearchSettingsDefaults(input);

    expect(input.search?.sortBy).toBe(before);
    expect(input.search?.sortBy).toBe(SortBy.UNSPECIFIED);
  });
});

describe("withUserSettingsDefaults", () => {
  it("fills missing search, catalog, and download domains", () => {
    const out = withUserSettingsDefaults(create(UserSettingsSchema, {}));

    expect(out.search?.searchResultDisplayBehavior).toBe(
      SEARCH_SETTINGS_FALLBACKS.searchResultDisplayBehavior,
    );
    expect(out.search?.searchResultTitleBehavior).toBe(
      SEARCH_SETTINGS_FALLBACKS.searchResultTitleBehavior,
    );
    expect(out.search?.sortBy).toBe(SEARCH_SETTINGS_FALLBACKS.sortBy);
    expect(out.search?.sortDirection).toBe(SEARCH_SETTINGS_FALLBACKS.sortDirection);
    expect(out.catalog?.moviesSource).toBe(CATALOG_SETTINGS_FALLBACKS.moviesSource);
    expect(out.catalog?.tvShowsSource).toBe(CATALOG_SETTINGS_FALLBACKS.tvShowsSource);
    expect(out.download).toBeDefined();
  });

  it("normalizes UNSPECIFIED catalog enum values", () => {
    const out = withUserSettingsDefaults(
      create(UserSettingsSchema, {
        catalog: create(CatalogSettingsSchema, {
          moviesSource: MoviesSource.UNSPECIFIED,
          tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED,
        }),
      }),
    );

    expect(out.catalog?.moviesSource).toBe(CATALOG_SETTINGS_FALLBACKS.moviesSource);
    expect(out.catalog?.tvShowsSource).toBe(CATALOG_SETTINGS_FALLBACKS.tvShowsSource);
  });

  it("preserves explicit catalog values", () => {
    const explicit = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.YTS,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
    });

    const out = withUserSettingsDefaults(explicit);

    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.catalog?.tvShowsSource).toBe(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
  });

  it("preserves explicit download folder values", () => {
    const out = withUserSettingsDefaults(
      create(UserSettingsSchema, {
        download: create(DownloadSettingsSchema, { folderId: 42n }),
      }),
    );

    expect(out.download?.folderId).toBe(42n);
  });
});

describe("withSaveUserSettingsResponseDefaults", () => {
  it("uses the saved request as fallback when the save response is empty", () => {
    const fallback = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        filterNastyResults: true,
        rememberQuickFilters: true,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.DESC,
      }),
      catalog: create(CatalogSettingsSchema, { moviesSource: MoviesSource.YTS }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    const out = withSaveUserSettingsResponseDefaults({
      fallback,
      response: create(UserSettingsSchema, {}),
    });

    expect(out.search?.sortBy).toBe(SortBy.SIZE);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.download?.folderId).toBe(42n);
  });

  it("prefers returned domains while preserving missing domains from the saved request", () => {
    const fallback = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        filterNastyResults: true,
        rememberQuickFilters: true,
        sortBy: SortBy.SIZE,
        sortDirection: SortDirection.DESC,
      }),
      catalog: create(CatalogSettingsSchema, { moviesSource: MoviesSource.YTS }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });
    const response = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, { sortBy: SortBy.TITLE }),
    });

    const out = withSaveUserSettingsResponseDefaults({ fallback, response });

    expect(out.search?.sortBy).toBe(SortBy.TITLE);
    expect(out.search?.filterNastyResults).toBe(true);
    expect(out.search?.rememberQuickFilters).toBe(true);
    expect(out.search?.sortDirection).toBe(SortDirection.DESC);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.download?.folderId).toBe(42n);
  });

  it("preserves missing fields inside a returned catalog domain", () => {
    const fallback = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
    });
    const response = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, { moviesSource: MoviesSource.YTS }),
    });

    const out = withSaveUserSettingsResponseDefaults({ fallback, response });

    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.catalog?.tvShowsSource).toBe(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
  });
});
