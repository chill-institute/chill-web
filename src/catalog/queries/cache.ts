import type { QueryClient } from "@tanstack/react-query";

import { toCatalogAppSettings, type UserSettings } from "@/catalog/lib/types";
import { MOVIES_QUERY_KEY } from "@/catalog/queries/options";
import type { SettingsSaveContext } from "@/queries/settings-mutation";

export function resetChangedMovieSourceQueries(
  queryClient: QueryClient,
  context: SettingsSaveContext | undefined,
  saved: UserSettings,
) {
  if (!context?.previousSettings) return;

  const previousSettings = toCatalogAppSettings(context.previousSettings);
  const savedSettings = toCatalogAppSettings(saved);
  if (previousSettings.moviesSource !== savedSettings.moviesSource) {
    void queryClient.resetQueries({ queryKey: MOVIES_QUERY_KEY });
  }
}
