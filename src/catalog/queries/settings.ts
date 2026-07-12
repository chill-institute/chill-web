import type { QueryClient } from "@tanstack/react-query";

import { resetChangedMovieSourceQueries } from "@/catalog/queries/cache";
import type { UserSettings } from "@/catalog/lib/types";
import { readCachedCatalogSettings } from "@/queries/settings-cache";
import { useSaveUserSettings, useUserSettingsQuery } from "@/queries/settings-hooks";
import type { SettingsSaveContext } from "@/queries/settings-mutation";

function resetSavedMovieSource({
  context,
  queryClient,
  saved,
}: {
  context: SettingsSaveContext | undefined;
  queryClient: QueryClient;
  saved: UserSettings;
}) {
  resetChangedMovieSourceQueries(queryClient, context, saved);
}

export function useSettingsQuery() {
  return useUserSettingsQuery(readCachedCatalogSettings);
}

export function useSaveSettings() {
  const mutation = useSaveUserSettings(resetSavedMovieSource);

  return {
    ...mutation,
    flush: mutation.mutate,
  };
}
