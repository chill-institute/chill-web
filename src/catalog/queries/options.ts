import { queryOptions } from "@tanstack/react-query";
import type { TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

import type { ChillApi } from "@/api/api";
import { createApi } from "@/lib/api";
import { readCachedCatalogSettings, writeCachedSettings } from "@/queries/settings-cache";
import { FIVE_MINUTES, userSettingsQueryOptions } from "@/queries/user-settings-options";
import { type Movie } from "@/catalog/lib/types";

export const MOVIES_QUERY_KEY = ["movies"] as const;
const TV_SHOWS_QUERY_KEY = ["tv-shows"] as const;
const MOVIE_SEARCH_QUERY_KEY = ["movie-search"] as const;
const TV_SHOW_DETAIL_QUERY_KEY = ["tv-show-detail"] as const;
const TV_SHOW_SEASON_QUERY_KEY = ["tv-show-season"] as const;
const TV_SHOW_SEASON_DOWNLOADS_QUERY_KEY = ["tv-show-season-downloads"] as const;

export function settingsQueryOptions(token: string) {
  return userSettingsQueryOptions(createApi(token), {
    read: readCachedCatalogSettings,
    write: writeCachedSettings,
  });
}

export function moviesQueryOptions(
  api: ChillApi,
  source: number | undefined,
  enabled = source !== undefined,
) {
  return queryOptions({
    queryKey: [...MOVIES_QUERY_KEY, source] as const,
    queryFn: ({ signal }) => api.getMovies(signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && source !== undefined,
  });
}

function movieSearchQuery(movie: Movie) {
  return [movie.title, movie.year].filter(Boolean).join(" ").trim();
}

export function movieSearchQueryOptions(api: ChillApi, movie: Movie, enabled = true) {
  const query = movieSearchQuery(movie);

  return queryOptions({
    queryKey: [...MOVIE_SEARCH_QUERY_KEY, movie.id, query] as const,
    queryFn: ({ signal }) => api.search(query, undefined, signal),
    staleTime: 60 * 1000,
    enabled: enabled && query.length > 0,
  });
}

export function tvShowsQueryOptions(
  api: ChillApi,
  source: TVShowsSource | undefined,
  enabled = source !== undefined,
) {
  return queryOptions({
    queryKey: [...TV_SHOWS_QUERY_KEY, source] as const,
    queryFn: ({ signal }) => api.getTVShows(source, signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && source !== undefined,
  });
}

export function tvShowDetailQueryOptions(api: ChillApi, imdbId: string, enabled = true) {
  return queryOptions({
    queryKey: [...TV_SHOW_DETAIL_QUERY_KEY, imdbId] as const,
    queryFn: ({ signal }) => api.getTVShowDetail(imdbId, signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && imdbId.trim().length > 0,
  });
}

export function tvShowSeasonQueryOptions(
  api: ChillApi,
  imdbId: string,
  seasonNumber: number,
  enabled = true,
) {
  return queryOptions({
    queryKey: [...TV_SHOW_SEASON_QUERY_KEY, imdbId, seasonNumber] as const,
    queryFn: ({ signal }) => api.getTVShowSeason(imdbId, seasonNumber, signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && imdbId.trim().length > 0 && seasonNumber > 0,
  });
}

export function tvShowSeasonDownloadsQueryOptions(
  api: ChillApi,
  imdbId: string,
  seasonNumber: number,
  enabled = true,
) {
  return queryOptions({
    queryKey: [...TV_SHOW_SEASON_DOWNLOADS_QUERY_KEY, imdbId, seasonNumber] as const,
    queryFn: ({ signal }) => api.getTVShowSeasonDownloads(imdbId, seasonNumber, signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && imdbId.trim().length > 0 && seasonNumber > 0,
  });
}
