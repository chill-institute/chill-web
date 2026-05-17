import { create } from "@bufbuild/protobuf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  DownloadSettingsSchema,
  SearchSettingsSchema,
  UserIndexerSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import {
  readCachedIndexers,
  readCachedSettings,
  writeCachedIndexers,
  writeCachedSettings,
} from "./options";

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
