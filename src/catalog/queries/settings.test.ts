import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { hasCompleteSettingsDomains, mergeSettingsDomains } from "./settings";

describe("settings domain helpers", () => {
  it("detects complete canonical settings", () => {
    const complete = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, { rememberQuickFilters: true }),
      catalog: create(CatalogSettingsSchema, { moviesSource: 1, tvShowsSource: 1 }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });
    const cachedCatalogAppSettings = create(UserSettingsSchema, {
      catalog: complete.catalog,
      download: complete.download,
    });

    expect(hasCompleteSettingsDomains(complete)).toBe(true);
    expect(hasCompleteSettingsDomains(cachedCatalogAppSettings)).toBe(false);
  });

  it("preserves search settings when saving a catalog-only patch", () => {
    const base = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, { rememberQuickFilters: true }),
      catalog: create(CatalogSettingsSchema, { moviesSource: 1, tvShowsSource: 1 }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });
    const next = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, { moviesSource: 2, tvShowsSource: 1 }),
      download: create(DownloadSettingsSchema, { folderId: 43n }),
    });

    const merged = mergeSettingsDomains(base, next);

    expect(merged.search?.rememberQuickFilters).toBe(true);
    expect(merged.catalog?.moviesSource).toBe(2);
    expect(merged.download?.folderId).toBe(43n);
  });
});
