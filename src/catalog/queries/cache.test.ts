import { create } from "@bufbuild/protobuf";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  CatalogSettingsSchema,
  MoviesSource,
  TVShowsSource,
  UserSettingsSchema,
} from "@chill-institute/contracts/chill/v4/api_pb";

import { MOVIES_QUERY_KEY } from "@/catalog/queries/options";
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

describe("catalog query cache resets", () => {
  it("resets movies when the saved movie source changes", () => {
    const queryClient = new QueryClient();
    const resetQueries = vi.spyOn(queryClient, "resetQueries");
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

    expect(resetQueries).toHaveBeenCalledWith({ queryKey: MOVIES_QUERY_KEY });
  });

  it("keeps URL-driven TV show queries when only the saved TV source changes", () => {
    const queryClient = new QueryClient();
    const resetQueries = vi.spyOn(queryClient, "resetQueries");
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

    expect(resetQueries).not.toHaveBeenCalled();
  });
});
