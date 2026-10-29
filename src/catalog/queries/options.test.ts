import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  GetMoviesResponseSchema,
  GetTVShowDetailResponseSchema,
  GetTVShowSeasonDownloadsResponseSchema,
  GetTVShowSeasonResponseSchema,
  GetTVShowsResponseSchema,
  MovieSchema,
  SearchResponseSchema,
  TVShowsSource,
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

describe("catalog query options", () => {
  it("gates catalog list queries until a source is known and caches each source apart", async () => {
    const api = createApiStub();
    const client = createQueryClient();
    const hbo = TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX;
    const netflix = TVShowsSource.TV_SHOWS_SOURCE_NETFLIX;

    expect(moviesQueryOptions(api, undefined).enabled).toBe(false);
    expect(tvShowsQueryOptions(api, undefined).enabled).toBe(false);
    expect(moviesQueryOptions(api, 2).enabled).toBe(true);
    expect(tvShowsQueryOptions(api, hbo).enabled).toBe(true);
    expect(moviesQueryOptions(api, 2).queryKey).not.toEqual(moviesQueryOptions(api, 3).queryKey);
    expect(tvShowsQueryOptions(api, hbo).queryKey).not.toEqual(
      tvShowsQueryOptions(api, netflix).queryKey,
    );
    expect(moviesQueryOptions(api, hbo).queryKey).not.toEqual(
      tvShowsQueryOptions(api, hbo).queryKey,
    );

    await client.fetchQuery(moviesQueryOptions(api, 2));
    await client.fetchQuery(tvShowsQueryOptions(api, hbo));

    expect(api.getMovies).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(api.getTVShows).toHaveBeenCalledWith(hbo, expect.any(AbortSignal));
  });

  it("searches torrents by movie title and year", async () => {
    const api = createApiStub();
    const client = createQueryClient();
    const movie = create(MovieSchema, { id: "m1", title: "Aurora", year: 2026 });
    const remake = create(MovieSchema, { id: "m1", title: "Aurora", year: 2027 });

    await client.fetchQuery(movieSearchQueryOptions(api, movie));

    expect(movieSearchQueryOptions(api, movie).enabled).toBe(true);
    expect(movieSearchQueryOptions(api, movie).queryKey).not.toEqual(
      movieSearchQueryOptions(api, remake).queryKey,
    );
    expect(api.search).toHaveBeenCalledWith('"Aurora" 2026', undefined, expect.any(AbortSignal));
  });

  it("drops quotes inside a title so the phrase stays well formed", async () => {
    const api = createApiStub();
    const client = createQueryClient();
    const movie = create(MovieSchema, { id: "m2", title: 'Say "Hi"', year: 2001 });

    await client.fetchQuery(movieSearchQueryOptions(api, movie));

    expect(api.search).toHaveBeenCalledWith('"Say Hi" 2001', undefined, expect.any(AbortSignal));
  });

  it("gates and calls TV show detail and season queries with route params", async () => {
    const api = createApiStub();
    const client = createQueryClient();

    expect(tvShowDetailQueryOptions(api, " ").enabled).toBe(false);
    expect(tvShowSeasonQueryOptions(api, "tt1", 0).enabled).toBe(false);
    expect(tvShowSeasonDownloadsQueryOptions(api, "tt1", 0).enabled).toBe(false);
    expect(tvShowDetailQueryOptions(api, "tt1").queryKey).not.toEqual(
      tvShowDetailQueryOptions(api, "tt2").queryKey,
    );
    expect(tvShowSeasonQueryOptions(api, "tt1", 2).queryKey).not.toEqual(
      tvShowSeasonQueryOptions(api, "tt1", 3).queryKey,
    );
    expect(tvShowSeasonQueryOptions(api, "tt1", 2).queryKey).not.toEqual(
      tvShowSeasonDownloadsQueryOptions(api, "tt1", 2).queryKey,
    );

    await client.fetchQuery(tvShowDetailQueryOptions(api, "tt1"));
    await client.fetchQuery(tvShowSeasonQueryOptions(api, "tt1", 2));
    await client.fetchQuery(tvShowSeasonDownloadsQueryOptions(api, "tt1", 2));

    expect(api.getTVShowDetail).toHaveBeenCalledWith("tt1", expect.any(AbortSignal));
    expect(api.getTVShowSeason).toHaveBeenCalledWith("tt1", 2, expect.any(AbortSignal));
    expect(api.getTVShowSeasonDownloads).toHaveBeenCalledWith("tt1", 2, expect.any(AbortSignal));
  });
});
