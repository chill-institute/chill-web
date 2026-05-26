import type { QueryClient } from "@tanstack/react-query";

import { createApi } from "@/lib/api";
import { saveSettingsWithCache } from "@/queries/settings-mutation";

import {
  applyCatalogAppSettingsPatch,
  toCatalogAppSettings,
  type CatalogAppSettings,
} from "@/catalog/lib/types";
import { resetChangedCatalogSourceQueries } from "@/catalog/queries/cache";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { writeCachedSettings } from "@/queries/settings-cache";

type CatalogSourceTab = "movies" | "tv-shows";

export async function syncCatalogSourceFromSearch({
  queryClient,
  source,
  tab,
  token,
}: {
  queryClient: QueryClient;
  source: number | undefined;
  tab: CatalogSourceTab;
  token: string;
}) {
  if (source === undefined) return;

  const settings = await queryClient.ensureQueryData(settingsQueryOptions(token));
  const appSettings = toCatalogAppSettings(settings);
  const patch: Partial<CatalogAppSettings> =
    tab === "movies" ? { moviesSource: source } : { tvShowsSource: source };
  const currentSource = tab === "movies" ? appSettings.moviesSource : appSettings.tvShowsSource;

  if (currentSource === source) return;

  const api = createApi(token);
  await saveSettingsWithCache({
    api,
    queryClient,
    update: (current) => applyCatalogAppSettingsPatch(current, patch),
    writeCachedSettings,
    onSuccess: (saved, context) => {
      resetChangedCatalogSourceQueries(queryClient, context, saved);
    },
  });
}
