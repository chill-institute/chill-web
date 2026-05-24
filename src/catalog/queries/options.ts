import { create } from "@bufbuild/protobuf";
import { queryOptions } from "@tanstack/react-query";
import * as v from "valibot";
import {
  CatalogSettingsSchema,
  DownloadSettingsSchema,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import type { ChillApi } from "@/api/api";
import { createApi } from "@/lib/api";
import { readStorageValue, writeStorageValue } from "@/lib/storage-codec";
import { USER_SETTINGS_QUERY_KEY } from "@/queries/keys";
import { toCatalogAppSettings, type Movie, type UserSettings } from "@/catalog/lib/types";

const FIVE_MINUTES = 5 * 60 * 1000;

const SETTINGS_STORAGE_KEY = "chill.catalog.settings.v1";

export const MOVIES_QUERY_KEY = ["movies"] as const;
export const TV_SHOWS_QUERY_KEY = ["tv-shows"] as const;
const MOVIE_SEARCH_QUERY_KEY = ["movie-search"] as const;
const TV_SHOW_DETAIL_QUERY_KEY = ["tv-show-detail"] as const;
const TV_SHOW_SEASON_QUERY_KEY = ["tv-show-season"] as const;
const TV_SHOW_SEASON_DOWNLOADS_QUERY_KEY = ["tv-show-season-downloads"] as const;

const cachedCatalogSettingsSchema = v.looseObject({
  catalog: v.looseObject({
    moviesSource: v.number(),
    tvShowsSource: v.number(),
  }),
  download: v.looseObject({
    folderId: v.optional(v.bigint()),
  }),
});

export function readCachedSettings(): UserSettings | undefined {
  return readStorageValue({
    key: SETTINGS_STORAGE_KEY,
    schema: cachedCatalogSettingsSchema,
    failureMessage: "Failed to read cached settings",
    invalidMessage: "Ignoring cached settings with an unexpected shape",
    createValue: (parsed) =>
      create(UserSettingsSchema, {
        catalog: create(CatalogSettingsSchema, parsed.catalog),
        download: create(DownloadSettingsSchema, parsed.download),
      }),
  });
}

export function writeCachedSettings(settings: UserSettings) {
  writeStorageValue({
    key: SETTINGS_STORAGE_KEY,
    value: settings,
    failureMessage: "Failed to write cached settings",
    createStoredValue: (nextSettings) => {
      const appSettings = toCatalogAppSettings(nextSettings);
      const { download, ...catalogSettings } = appSettings;
      return {
        catalog: create(CatalogSettingsSchema, catalogSettings),
        download: create(DownloadSettingsSchema, download),
      };
    },
  });
}

export function settingsQueryOptions(token: string) {
  return settingsQueryOptionsForApi(createApi(token));
}

export function settingsQueryOptionsForApi(api: ChillApi) {
  return queryOptions({
    queryKey: USER_SETTINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const settings = await api.getUserSettings(signal);
      writeCachedSettings(settings);
      return settings;
    },
    staleTime: FIVE_MINUTES,
    placeholderData: readCachedSettings(),
  });
}

export function moviesQueryOptions(api: ChillApi, source: number | undefined) {
  return queryOptions({
    queryKey: [...MOVIES_QUERY_KEY, source] as const,
    queryFn: ({ signal }) => api.getMovies(signal),
    staleTime: FIVE_MINUTES,
    enabled: source !== undefined,
  });
}

export function movieSearchQueryOptions(api: ChillApi, movie: Movie) {
  const query = [movie.title, movie.year].filter(Boolean).join(" ").trim();

  return queryOptions({
    queryKey: [...MOVIE_SEARCH_QUERY_KEY, movie.id, query] as const,
    queryFn: ({ signal }) => api.search(query, undefined, signal),
    staleTime: 60 * 1000,
    enabled: query.length > 0,
  });
}

export function tvShowsQueryOptions(api: ChillApi, source: number | undefined) {
  return queryOptions({
    queryKey: [...TV_SHOWS_QUERY_KEY, source] as const,
    queryFn: ({ signal }) => api.getTVShows(signal),
    staleTime: FIVE_MINUTES,
    enabled: source !== undefined,
  });
}

export function tvShowDetailQueryOptions(api: ChillApi, imdbId: string) {
  return queryOptions({
    queryKey: [...TV_SHOW_DETAIL_QUERY_KEY, imdbId] as const,
    queryFn: ({ signal }) => api.getTVShowDetail(imdbId, signal),
    staleTime: FIVE_MINUTES,
    enabled: imdbId.trim().length > 0,
  });
}

export function tvShowSeasonQueryOptions(api: ChillApi, imdbId: string, seasonNumber: number) {
  return queryOptions({
    queryKey: [...TV_SHOW_SEASON_QUERY_KEY, imdbId, seasonNumber] as const,
    queryFn: ({ signal }) => api.getTVShowSeason(imdbId, seasonNumber, signal),
    staleTime: FIVE_MINUTES,
    enabled: imdbId.trim().length > 0 && seasonNumber > 0,
  });
}

export function tvShowSeasonDownloadsQueryOptions(
  api: ChillApi,
  imdbId: string,
  seasonNumber: number,
) {
  return queryOptions({
    queryKey: [...TV_SHOW_SEASON_DOWNLOADS_QUERY_KEY, imdbId, seasonNumber] as const,
    queryFn: ({ signal }) => api.getTVShowSeasonDownloads(imdbId, seasonNumber, signal),
    staleTime: FIVE_MINUTES,
    enabled: imdbId.trim().length > 0 && seasonNumber > 0,
  });
}
