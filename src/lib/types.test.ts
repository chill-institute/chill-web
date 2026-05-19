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

import { applyChillSettingsPatch, resetChillSettings } from "./types";

describe("applyChillSettingsPatch", () => {
  it("updates search fields without touching catalog fields", () => {
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        sortBy: SortBy.SEEDERS,
      }),
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.YTS,
      }),
    });

    const out = applyChillSettingsPatch(settings, {
      sortBy: SortBy.SIZE,
    });

    expect(out.search?.sortBy).toBe(SortBy.SIZE);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
  });

  it("does not synthesize missing catalog or download domains", () => {
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        sortBy: SortBy.SEEDERS,
      }),
    });

    const out = applyChillSettingsPatch(settings, {
      sortBy: SortBy.SIZE,
    });

    expect(out.catalog).toBeUndefined();
    expect(out.download).toBeUndefined();
    expect(out.search?.sortBy).toBe(SortBy.SIZE);
  });

  it("preserves download settings when search fields change", () => {
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        sortBy: SortBy.SEEDERS,
      }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    const out = applyChillSettingsPatch(settings, {
      sortBy: SortBy.SIZE,
    });

    expect(out.download?.folderId).toBe(42n);
  });
});

describe("resetChillSettings", () => {
  it("resets search settings and preserves unrelated domains", () => {
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        sortBy: SortBy.SIZE,
      }),
      catalog: create(CatalogSettingsSchema, {
        moviesSource: MoviesSource.YTS,
      }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    const out = resetChillSettings(settings);

    expect(out.search?.sortBy).toBe(SortBy.SEEDERS);
    expect(out.catalog?.moviesSource).toBe(MoviesSource.YTS);
    expect(out.download?.folderId).toBe(42n);
  });
});
