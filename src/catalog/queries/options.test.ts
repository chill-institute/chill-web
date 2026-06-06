import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  GetMoviesResponseSchema,
  GetTVShowDetailResponseSchema,
  GetTVShowSeasonDownloadsResponseSchema,
  GetTVShowSeasonResponseSchema,
  GetTVShowsResponseSchema,
  MovieSchema,
  SearchResponseSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import type { ChillApi } from "@/api/api";

import {
  movieSearchQueryOptions,
  moviesQueryOptions,
  tvShowDetailQueryOptions,
  tvShowSeasonDownloadsQueryOptions,
  tvShowSeasonQueryOptions,
  tvShowsQueryOptions,
} from "./options";
import {
  readCachedCatalogSettings as readCachedSettings,
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

function unusedCall() {
  return Promise.reject(new Error("unused api method"));
}

function createApiStub() {
  return {
    getUserProfile: unusedCall,
    search: vi.fn(async () => create(SearchResponseSchema, {})),
    getIndexers: unusedCall,
    getUserSettings: unusedCall,
    saveUserSettings: unusedCall,
    addTransfer: unusedCall,
    getDownloadFolder: unusedCall,
    getFolder: unusedCall,
    getMovies: vi.fn(async () => create(GetMoviesResponseSchema, {})),
    getTVShows: vi.fn(async () => create(GetTVShowsResponseSchema, {})),
    getTVShowDetail: vi.fn(async () => create(GetTVShowDetailResponseSchema, {})),
    getTVShowSeason: vi.fn(async () => create(GetTVShowSeasonResponseSchema, {})),
    getTVShowSeasonDownloads: vi.fn(async () => create(GetTVShowSeasonDownloadsResponseSchema, {})),
  } satisfies ChillApi;
}

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

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
    expect(readCachedSettings()?.search).toBeUndefined();
  });

  it("ignores cached settings with an unexpected shape", () => {
    storage.set("chill.catalog.settings.v1", JSON.stringify({ nope: true }));

    expect(readCachedSettings()).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      "[chill] Ignoring cached settings with an unexpected shape",
    );
  });
});

describe("catalog query options", () => {
  it("keys and gates catalog list queries by source", async () => {
    const api = createApiStub();
    const client = createQueryClient();

    expect(moviesQueryOptions(api, undefined).queryKey).toEqual(["movies", undefined]);
    expect(moviesQueryOptions(api, undefined).enabled).toBe(false);
    expect(tvShowsQueryOptions(api, undefined).queryKey).toEqual(["tv-shows", undefined]);
    expect(tvShowsQueryOptions(api, undefined).enabled).toBe(false);

    await client.fetchQuery(moviesQueryOptions(api, 2));
    await client.fetchQuery(tvShowsQueryOptions(api, 3));

    expect(moviesQueryOptions(api, 2).queryKey).toEqual(["movies", 2]);
    expect(moviesQueryOptions(api, 2).enabled).toBe(true);
    expect(tvShowsQueryOptions(api, 3).queryKey).toEqual(["tv-shows", 3]);
    expect(tvShowsQueryOptions(api, 3).enabled).toBe(true);
    expect(api.getMovies).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.getTVShows).toHaveBeenCalledWith(3, expect.any(AbortSignal));
  });

  it("builds movie search query keys and API arguments from movie identity", async () => {
    const api = createApiStub();
    const client = createQueryClient();
    const movie = create(MovieSchema, { id: "m1", title: "Aurora", year: 2026 });

    await client.fetchQuery(movieSearchQueryOptions(api, movie));

    expect(movieSearchQueryOptions(api, movie).queryKey).toEqual([
      "movie-search",
      "m1",
      "Aurora 2026",
    ]);
    expect(movieSearchQueryOptions(api, movie).enabled).toBe(true);
    expect(api.search).toHaveBeenCalledWith("Aurora 2026", undefined, expect.any(AbortSignal));
  });

  it("keys, gates, and calls TV show detail and season queries with route params", async () => {
    const api = createApiStub();
    const client = createQueryClient();

    expect(tvShowDetailQueryOptions(api, " ").enabled).toBe(false);
    expect(tvShowSeasonQueryOptions(api, "tt1", 0).enabled).toBe(false);
    expect(tvShowSeasonDownloadsQueryOptions(api, "tt1", 0).enabled).toBe(false);

    await client.fetchQuery(tvShowDetailQueryOptions(api, "tt1"));
    await client.fetchQuery(tvShowSeasonQueryOptions(api, "tt1", 2));
    await client.fetchQuery(tvShowSeasonDownloadsQueryOptions(api, "tt1", 2));

    expect(tvShowDetailQueryOptions(api, "tt1").queryKey).toEqual(["tv-show-detail", "tt1"]);
    expect(tvShowSeasonQueryOptions(api, "tt1", 2).queryKey).toEqual(["tv-show-season", "tt1", 2]);
    expect(tvShowSeasonDownloadsQueryOptions(api, "tt1", 2).queryKey).toEqual([
      "tv-show-season-downloads",
      "tt1",
      2,
    ]);
    expect(api.getTVShowDetail).toHaveBeenCalledWith("tt1", expect.any(AbortSignal));
    expect(api.getTVShowSeason).toHaveBeenCalledWith("tt1", 2, expect.any(AbortSignal));
    expect(api.getTVShowSeasonDownloads).toHaveBeenCalledWith("tt1", 2, expect.any(AbortSignal));
  });
});
