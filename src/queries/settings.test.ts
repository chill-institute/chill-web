import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  MoviesSource,
  SearchSettingsSchema,
  SortBy,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { hasCompleteSettingsDomains, mergeSettingsDomains } from "./settings-mutation";

describe("settings save payloads", () => {
  it("detects complete settings domains", () => {
    expect(
      hasCompleteSettingsDomains(
        create(UserSettingsSchema, {
          search: create(SearchSettingsSchema),
          catalog: create(CatalogSettingsSchema),
          download: create(DownloadSettingsSchema),
        }),
      ),
    ).toBe(true);
    expect(hasCompleteSettingsDomains(create(UserSettingsSchema, {}))).toBe(false);
  });

  it("merges cached chill domains onto canonical server settings", () => {
    const base = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, { sortBy: SortBy.SEEDERS }),
      catalog: create(CatalogSettingsSchema, { moviesSource: MoviesSource.YTS }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });
    const cachedPatch = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, { sortBy: SortBy.SIZE }),
      download: create(DownloadSettingsSchema, { folderId: 99n }),
    });

    const out = mergeSettingsDomains(base, cachedPatch);

    expect(out.search?.sortBy).toBe(SortBy.SIZE);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.download?.folderId).toBe(99n);
  });
});
