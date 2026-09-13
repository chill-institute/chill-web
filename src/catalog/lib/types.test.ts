import { create } from "@bufbuild/protobuf";
import {
  CatalogSettingsSchema,
  CatalogSort,
  DownloadSettingsSchema,
  MoviesSource,
  SearchSettingsSchema,
  SortBy,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";
import { describe, expect, it } from "vite-plus/test";

import { applyChillSettingsPatch, resetChillSettings } from "@/lib/types";
import { applyCatalogAppSettingsPatch, toCatalogAppSettings } from "./types";

function savedSettings() {
  return create(UserSettingsSchema, {
    search: create(SearchSettingsSchema, { sortBy: SortBy.SIZE, rememberQuickFilters: true }),
    catalog: create(CatalogSettingsSchema, {
      moviesSource: MoviesSource.TRAKT,
      sort: CatalogSort.RATING_DESC,
    }),
    download: create(DownloadSettingsSchema, { folderId: 42n }),
  });
}

describe("catalog settings patches", () => {
  it("preserves the shared sort when changing a provider or download folder", () => {
    const settings = savedSettings();
    const result = applyCatalogAppSettingsPatch(settings, {
      moviesSource: MoviesSource.YTS,
      download: { folderId: 43n },
    });
    expect(result.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(result.catalog?.sort).toBe(CatalogSort.RATING_DESC);
    expect(result.download?.folderId).toBe(43n);
    expect(result.search).toEqual(settings.search);
    expect(settings.download?.folderId).toBe(42n);
  });

  it("changes the shared sort without changing provider or search/download settings", () => {
    const settings = savedSettings();
    const result = applyCatalogAppSettingsPatch(settings, { sort: CatalogSort.POPULARITY });
    expect(result.catalog?.sort).toBe(CatalogSort.POPULARITY);
    expect(result.catalog?.moviesSource).toBe(MoviesSource.TRAKT);
    expect(result.search).toEqual(settings.search);
    expect(result.download).toEqual(settings.download);
  });

  it("preserves catalog preferences through search updates and reset", () => {
    const settings = savedSettings();
    const changed = applyChillSettingsPatch(settings, { sortBy: SortBy.TITLE });
    expect(changed.catalog).toEqual(settings.catalog);
    expect(resetChillSettings(changed).catalog).toEqual(settings.catalog);
  });

  it("defaults legacy catalog settings to popularity", () => {
    const settings = toCatalogAppSettings(create(UserSettingsSchema));
    expect(settings.sort).toBe(CatalogSort.POPULARITY);
  });
});
