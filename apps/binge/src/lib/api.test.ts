import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  MoviesSource,
  SearchSettingsSchema,
  SortBy,
  TVShowsSource,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { withCatalogDefaults } from "./api";
import { applyBingeSettingsPatch, defaultUserSettings, toBingeSettings } from "./types";

describe("withCatalogDefaults", () => {
  it("leaves full user settings untouched after shared defaults run", () => {
    const explicit = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.YTS,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
    });

    const out = withCatalogDefaults(explicit);

    expect(out).toBe(explicit);
  });
});

describe("toBingeSettings", () => {
  it("fills catalog defaults for the app domain", () => {
    const out = toBingeSettings(create(UserSettingsSchema, {}));

    expect(out.moviesSource).toBe(defaultUserSettings.moviesSource);
    expect(out.tvShowsSource).toBe(defaultUserSettings.tvShowsSource);
  });
});

describe("applyBingeSettingsPatch", () => {
  it("updates catalog fields without touching search fields", () => {
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        sortBy: SortBy.SIZE,
      }),
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    });

    const out = applyBingeSettingsPatch(settings, {
      moviesSource: MoviesSource.YTS,
      tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
    });

    expect(out.search?.sortBy).toBe(SortBy.SIZE);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.catalog?.tvShowsSource).toBe(TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX);
  });

  it("does not synthesize missing search or download domains", () => {
    const settings = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
    });

    const out = applyBingeSettingsPatch(settings, {
      moviesSource: MoviesSource.YTS,
    });

    expect(out.search).toBeUndefined();
    expect(out.download).toBeUndefined();
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
  });

  it("preserves download settings when catalog fields change", () => {
    const settings = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
      }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    const out = applyBingeSettingsPatch(settings, {
      moviesSource: MoviesSource.YTS,
    });

    expect(out.download?.folderId).toBe(42n);
  });

  it("normalizes unspecified catalog fields before applying patches", () => {
    const settings = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.UNSPECIFIED,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_UNSPECIFIED,
      }),
    });

    const out = applyBingeSettingsPatch(settings, {
      moviesSource: MoviesSource.YTS,
    });

    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.catalog?.tvShowsSource).toBe(defaultUserSettings.tvShowsSource);
  });
});
