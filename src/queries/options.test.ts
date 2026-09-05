import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserIndexerSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/api/api";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";
import { userSettingsQueryOptions } from "@/queries/user-settings-options";

import {
  readCachedIndexers,
  readCachedSearchSettings as readCachedSettings,
  writeCachedIndexers,
  writeCachedSettings,
} from "@/queries/settings-cache";

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

describe("cached settings", () => {
  it("round-trips valid cached settings", () => {
    const settings = create(UserSettingsSchema, {
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
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    writeCachedSettings(settings);

    expect(readCachedSettings()?.search).toEqual(settings.search);
    expect(readCachedSettings()?.download).toEqual(settings.download);
    expect(readCachedSettings()?.catalog).toBeUndefined();
  });

  it("ignores cached settings with an unexpected shape", () => {
    storage.set("chill.search.settings.v1", JSON.stringify({ nope: true }));

    expect(readCachedSettings()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Ignoring cached settings with an unexpected shape",
    );
  });
});

describe("cached indexers", () => {
  it("round-trips valid cached indexers", () => {
    const indexers = [create(UserIndexerSchema, { id: "yts", name: "YTS", enabled: true })];

    writeCachedIndexers(indexers);

    expect(readCachedIndexers()).toEqual(indexers);
  });

  it("warns when cached indexers cannot be parsed", () => {
    storage.set("chill.indexers", "{not-json");

    expect(readCachedIndexers()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Failed to read cached indexers",
      expect.any(SyntaxError),
    );
  });
});

describe("settings placeholder", () => {
  for (const count of [20, 100, 500]) {
    it(`does not read storage for ${count} observers with warm Query data`, () => {
      const api = createApi({ authToken: "test-token", baseUrl: "https://example.test" });
      const client = new QueryClient();
      const settings = create(UserSettingsSchema);
      const cache = { read: vi.fn(() => settings), write: vi.fn() };
      client.setQueryData(USER_SETTINGS_QUERY_KEY, settings);
      for (let i = 0; i < count; i += 1) {
        const observer = new QueryObserver(client, userSettingsQueryOptions(api, cache));
        expect(observer.getCurrentResult().data).toEqual(settings);
        expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
        observer.destroy();
      }
      expect(cache.read).not.toHaveBeenCalled();
      client.clear();
    });
  }

  it("reads the validated storage fallback only when an observer needs missing Query data", () => {
    const api = createApi({ authToken: "test-token", baseUrl: "https://example.test" });
    const client = new QueryClient();
    const settings = create(UserSettingsSchema, {
      search: create(SearchSettingsSchema),
      download: { folderId: 42n },
    });
    writeCachedSettings(settings);
    const cache = { read: vi.fn(readCachedSettings), write: vi.fn() };
    const options = userSettingsQueryOptions(api, cache);
    expect(cache.read).not.toHaveBeenCalled();
    const observer = new QueryObserver(client, options);
    expect(cache.read).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().data?.download?.folderId).toBe(42n);
    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);
    expect(client.getQueryData(USER_SETTINGS_QUERY_KEY)).toBeUndefined();
    observer.destroy();
    client.clear();
  });

  it("keeps missing storage pending without inventing settings", () => {
    const api = createApi({ authToken: "test-token", baseUrl: "https://example.test" });
    const client = new QueryClient();
    const cache = { read: vi.fn(readCachedSettings), write: vi.fn() };
    const observer = new QueryObserver(client, userSettingsQueryOptions(api, cache));
    expect(cache.read).toHaveBeenCalledTimes(1);
    expect(observer.getCurrentResult().status).toBe("pending");
    expect(observer.getCurrentResult().data).toBeUndefined();
    observer.destroy();
    client.clear();
  });
});
