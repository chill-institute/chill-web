import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  GetMoviesResponseSchema,
  GetTVShowsResponseSchema,
  MoviesSource,
  TVShowsSource,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/api/api";
import { moviesQueryOptions, tvShowsQueryOptions } from "@/catalog/queries/options";
import type { SettingsSaveContext } from "@/queries/settings-mutation";

import { resetChangedMovieSourceQueries } from "./cache";

function settings({
  moviesSource,
  tvShowsSource,
}: {
  moviesSource: MoviesSource;
  tvShowsSource: TVShowsSource;
}) {
  return create(UserSettingsSchema, {
    catalog: create(CatalogSettingsSchema, {
      moviesSource,
      tvShowsSource,
    }),
  });
}

function cachedCatalogLists() {
  const api = createApi({ authToken: "placeholder", baseUrl: "https://api.example.test" });
  const queryClient = new QueryClient();
  const movies = moviesQueryOptions(api, MoviesSource.ROTTEN_TOMATOES).queryKey;
  const tvShows = tvShowsQueryOptions(api, TVShowsSource.TV_SHOWS_SOURCE_NETFLIX).queryKey;
  queryClient.setQueryData(movies, create(GetMoviesResponseSchema));
  queryClient.setQueryData(tvShows, create(GetTVShowsResponseSchema));
  return { queryClient, movies, tvShows };
}

describe("catalog query cache resets", () => {
  it("resets movies when the saved movie source changes", () => {
    const { queryClient, movies, tvShows } = cachedCatalogLists();
    const context: SettingsSaveContext = {
      previousSettings: settings({
        moviesSource: MoviesSource.ROTTEN_TOMATOES,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    };

    resetChangedMovieSourceQueries(
      queryClient,
      context,
      settings({
        moviesSource: MoviesSource.IMDB_MOVIEMETER,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    );

    expect(queryClient.getQueryData(movies)).toBeUndefined();
    expect(queryClient.getQueryData(tvShows)).toBeDefined();
  });

  it("keeps URL-driven TV show queries when only the saved TV source changes", () => {
    const { queryClient, movies, tvShows } = cachedCatalogLists();
    const context: SettingsSaveContext = {
      previousSettings: settings({
        moviesSource: MoviesSource.ROTTEN_TOMATOES,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_NETFLIX,
      }),
    };

    resetChangedMovieSourceQueries(
      queryClient,
      context,
      settings({
        moviesSource: MoviesSource.ROTTEN_TOMATOES,
        tvShowsSource: TVShowsSource.TV_SHOWS_SOURCE_HBO_MAX,
      }),
    );

    expect(queryClient.getQueryData(movies)).toBeDefined();
    expect(queryClient.getQueryData(tvShows)).toBeDefined();
  });
});
