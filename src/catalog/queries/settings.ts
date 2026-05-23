import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { invalidateDownloadFolder } from "@/auth/queries/download-folder";
import type { UserSettings } from "@/catalog/lib/types";
import { resetChangedCatalogSourceQueries } from "@/catalog/queries/cache";
import { readCachedSettings, writeCachedSettings } from "@/catalog/queries/options";
import {
  downloadFolderChanged,
  prepareSettingsSave,
  saveSettings,
  settingsSaveIsCurrent,
  USER_SETTINGS_MUTATION_SCOPE,
  USER_SETTINGS_QUERY_KEY,
  type SettingsSaveContext,
  type SettingsUpdate,
} from "@/queries/settings-mutation";

export function useSettingsQuery() {
  const api = useApi();

  return useQuery({
    queryKey: ["user-settings"],
    queryFn: async ({ signal }) => {
      const settings = await api.getUserSettings(signal);
      writeCachedSettings(settings);
      return settings;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: readCachedSettings(),
  });
}

export function useSaveSettings() {
  const api = useApi();
  const queryClient = useQueryClient();

  const mutation = useMutation<UserSettings, Error, SettingsUpdate, SettingsSaveContext>({
    mutationFn: (update) =>
      saveSettings({
        api,
        queryClient,
        update,
      }),
    onMutate: (update) => prepareSettingsSave({ queryClient, update }),
    onSuccess: (saved, _update, context) => {
      if (settingsSaveIsCurrent({ context, queryClient })) {
        queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, saved);
        writeCachedSettings(saved);
      }
      resetChangedCatalogSourceQueries(queryClient, context, saved);
      if (downloadFolderChanged(context.previousSettings, saved)) {
        void invalidateDownloadFolder(queryClient);
      }
    },
    onError: (_error, _update, context) => {
      if (settingsSaveIsCurrent({ context, queryClient })) {
        void queryClient.invalidateQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
      }
    },
    scope: USER_SETTINGS_MUTATION_SCOPE,
  });

  return {
    ...mutation,
    flush: mutation.mutate,
  };
}
