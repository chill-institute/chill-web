import { create } from "@bufbuild/protobuf";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { readCachedSettings, writeCachedSettings } from "./options";

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
      catalog: create(CatalogSettingsSchema, {
        moviesSource: 1,
        tvShowsSource: 1,
      }),
      download: create(DownloadSettingsSchema, { folderId: 42n }),
    });

    writeCachedSettings(settings);

    expect(readCachedSettings()?.catalog).toEqual(settings.catalog);
    expect(readCachedSettings()?.download).toEqual(settings.download);
  });

  it("ignores cached settings with an unexpected shape", () => {
    storage.set("chill.settings", JSON.stringify({ nope: true }));

    expect(readCachedSettings()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Ignoring cached settings with an unexpected shape",
    );
  });
});
