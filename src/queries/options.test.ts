import { create } from "@bufbuild/protobuf";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  SearchSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/api/api";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";
import { userSettingsQueryOptions } from "@/queries/user-settings-options";

import {
  readCachedSearchSettings as readCachedSettings,
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("settings placeholder", () => {
  it("does not read storage for observers with warm Query data", () => {
    const api = createApi({ authToken: "test-token", baseUrl: "https://example.test" });
    const client = new QueryClient();
    const settings = create(UserSettingsSchema);
    const cache = { read: vi.fn(() => settings), write: vi.fn() };
    client.setQueryData(USER_SETTINGS_QUERY_KEY, settings);
    for (let i = 0; i < 20; i += 1) {
      const observer = new QueryObserver(client, userSettingsQueryOptions(api, cache));
      expect(observer.getCurrentResult().data).toEqual(settings);
      expect(observer.getCurrentResult().isPlaceholderData).toBe(false);
      observer.destroy();
    }
    expect(cache.read).not.toHaveBeenCalled();
    client.clear();
  });

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
