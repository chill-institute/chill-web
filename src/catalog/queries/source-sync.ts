import type { QueryClient } from "@tanstack/react-query";
import type { MoviesSource } from "@chill-institute/contracts/chill/v4/api_pb";

import { createApi } from "@/lib/api";
import { saveSettingsWithCache } from "@/queries/settings-mutation";

import { applyCatalogAppSettingsPatch, toCatalogAppSettings } from "@/catalog/lib/types";
import { resetChangedMovieSourceQueries } from "@/catalog/queries/cache";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { writeCachedSettings } from "@/queries/settings-cache";

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

  const settings = await queryClient.ensureQueryData(settingsQueryOptions(token));
  const appSettings = toCatalogAppSettings(settings);

  if (appSettings.moviesSource === source) return;

  const api = createApi(token);
  await saveSettingsWithCache({
    api,
    queryClient,
    update: (current) => applyCatalogAppSettingsPatch(current, { moviesSource: source }),
    writeCachedSettings,
    onSuccess: (saved, context) => {
      resetChangedMovieSourceQueries(queryClient, context, saved);
    },
  });
}
