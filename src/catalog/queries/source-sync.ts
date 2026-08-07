import type { QueryClient } from "@tanstack/react-query";
import type { MoviesSource } from "@chill-institute/contracts/chill/v4/api_pb";

import { annotateClientRequestTimeout } from "@/api/request-timeout";
import { createApi } from "@/lib/api";
import { saveSettingsWithCache } from "@/queries/settings-mutation";

import { applyCatalogAppSettingsPatch, toCatalogAppSettings } from "@/catalog/lib/types";
import { resetChangedMovieSourceQueries } from "@/catalog/queries/cache";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { writeCachedSettings } from "@/queries/settings-cache";

let movieSourceSyncChain: Promise<void> = Promise.resolve();
let movieSourceSyncGeneration = 0;

export async function syncMovieSourceFromSearch({
  queryClient,
  source,
  token,
}: {
  queryClient: QueryClient;
  source: MoviesSource | undefined;
  token: string;
}) {
  if (source === undefined) return;

  // Latest-wins: overlapping loader runs must not let an older source overwrite a newer URL.
  const generation = ++movieSourceSyncGeneration;
  const run = async () => {
    if (generation !== movieSourceSyncGeneration) return;
    await persistMovieSourceFromSearch({ queryClient, source, token, generation });
  };

  movieSourceSyncChain = movieSourceSyncChain.then(run, run);
  return movieSourceSyncChain;
}

async function persistMovieSourceFromSearch({
  queryClient,
  source,
  token,
  generation,
}: {
  queryClient: QueryClient;
  source: MoviesSource;
  token: string;
  generation: number;
}) {
  const settings = await queryClient.fetchQuery(settingsQueryOptions(token)).catch((error) => {
    annotateClientRequestTimeout(error, {
      operation: "settings.read",
      surface: "movies.source-sync",
    });
    throw error;
  });
  if (generation !== movieSourceSyncGeneration) return;

  const appSettings = toCatalogAppSettings(settings);
  if (appSettings.moviesSource === source) return;

  const api = createApi(token);
  try {
    await saveSettingsWithCache({
      api,
      queryClient,
      update: (current) => applyCatalogAppSettingsPatch(current, { moviesSource: source }),
      writeCachedSettings,
      onSuccess: (saved, context) => {
        resetChangedMovieSourceQueries(queryClient, context, saved);
      },
    });
  } catch (error) {
    annotateClientRequestTimeout(error, {
      operation: "settings.write",
      surface: "movies.source-sync",
    });
    throw error;
  }
}
