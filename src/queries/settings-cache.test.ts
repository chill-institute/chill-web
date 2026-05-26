import { create } from "@bufbuild/protobuf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserIndexerSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import {
  readCachedIndexers,
  readCachedCatalogSettings,
  readCachedSearchSettings,
  writeCachedIndexers,
  writeCachedSettings,
} from "./settings-cache";

const storage = new Map<string, string>();

function installLocalStorage() {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  });
}

beforeEach(() => {
  storage.clear();
  installLocalStorage();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("settings cache", () => {
  it("preserves cached settings from another app domain", () => {
    const catalogSettings = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, { moviesSource: 1, tvShowsSource: 1 }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });
    const searchSettings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, {
        codecFilters: [],
        disabledIndexerIds: ["yts"],
        filterNastyResults: true,
        filterResultsWithNoSeeders: false,
        otherFilters: [],
        rememberQuickFilters: false,
        resolutionFilters: [],
        searchResultDisplayBehavior: 2,
        searchResultTitleBehavior: 2,
        sortBy: 2,
        sortDirection: 2,
      }),
    });

    writeCachedSettings(catalogSettings);
    writeCachedSettings(searchSettings);

    expect(readCachedCatalogSettings()?.catalog).toEqual(catalogSettings.catalog);
    expect(readCachedSearchSettings()?.search).toEqual(searchSettings.search);
    expect(storage.has("chill.user-settings.v1")).toBe(true);
  });

  it("reads legacy search settings with bigint suffixes", () => {
    storage.set(
      "chill.search.settings.v1",
      JSON.stringify({
        search: {
          codecFilters: [],
          disabledIndexerIds: [],
          filterNastyResults: true,
          filterResultsWithNoSeeders: false,
          otherFilters: [],
          rememberQuickFilters: false,
          resolutionFilters: [],
          searchResultDisplayBehavior: 2,
          searchResultTitleBehavior: 2,
          sortBy: 2,
          sortDirection: 2,
        },
        download: { folderId: "42n" },
      }),
    );

    expect(readCachedSearchSettings()?.download?.folderId).toBe(42n);
  });

  it("overwrites unreadable unified cache entries", () => {
    const settings = create(UserSettingsSchema, {
      catalog: create(CatalogSettingsSchema, { moviesSource: 1, tvShowsSource: 1 }),
      download: create(DownloadSettingsSchema),
    });
    storage.set("chill.user-settings.v1", "{not-json");

    writeCachedSettings(settings);

    expect(readCachedCatalogSettings()?.catalog).toEqual(settings.catalog);
  });

  it("rejects protobuf-decodable settings with missing required cache fields", () => {
    storage.set("chill.user-settings.v1", JSON.stringify({ search: {}, download: {} }));

    expect(readCachedSearchSettings()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Ignoring cached settings with an unexpected shape",
    );
  });

  it("does not preserve malformed sibling domains from unified cache", () => {
    const search = {
      codecFilters: [],
      disabledIndexerIds: [],
      filterNastyResults: true,
      filterResultsWithNoSeeders: false,
      otherFilters: [],
      rememberQuickFilters: false,
      resolutionFilters: [],
      searchResultDisplayBehavior: 2,
      searchResultTitleBehavior: 2,
      sortBy: 2,
      sortDirection: 2,
    };
    const searchSettings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema, search),
      download: create(DownloadSettingsSchema),
    });
    storage.set(
      "chill.user-settings.v1",
      JSON.stringify({
        search,
        catalog: {},
        download: {},
      }),
    );

    writeCachedSettings(searchSettings);

    expect(readCachedSearchSettings()?.search).toEqual(searchSettings.search);
    expect(readCachedCatalogSettings()).toBeUndefined();
  });
});

describe("indexer cache", () => {
  it("reads legacy indexer arrays", () => {
    const indexer = create(UserIndexerSchema, { id: "yts", name: "YTS", enabled: true });
    storage.set("chill.indexers", JSON.stringify([indexer]));

    expect(readCachedIndexers()).toEqual([indexer]);
  });

  it("round-trips disabled indexers without losing the required enabled field", () => {
    const indexer = create(UserIndexerSchema, { id: "rarbg", name: "RARBG", enabled: false });

    writeCachedIndexers([indexer]);

    expect(readCachedIndexers()).toEqual([indexer]);
  });

  it("rejects protobuf-decodable indexers with missing required cache fields", () => {
    storage.set("chill.indexers", JSON.stringify({ indexers: [{}] }));

    expect(readCachedIndexers()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Failed to read cached indexers",
      expect.any(Error),
    );
  });
});
