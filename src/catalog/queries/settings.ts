import { create } from "@bufbuild/protobuf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserSettingsSchema } from "@chill-institute/contracts/chill/v4/api_pb";

import { useApi } from "@/auth/api-context";
import { invalidateDownloadFolder } from "@/auth/queries/download-folder";
import { toCatalogAppSettings, type UserSettings } from "@/catalog/lib/types";
import { readCachedSettings, writeCachedSettings } from "@/catalog/queries/options";
import {
  applySettingsUpdate,
  cacheSavedSettings,
  downloadFolderChanged,
  prepareSettingsSave,
  settingsSaveIsCurrent,
  stagedSettingsForSave,
  USER_SETTINGS_MUTATION_SCOPE,
  USER_SETTINGS_QUERY_KEY,
  type SettingsSaveContext,
  type SettingsUpdate,
} from "@/queries/settings-mutation";

export function hasCompleteSettingsDomains(settings: UserSettings) {
  return (
    settings.search !== undefined &&
    settings.catalog !== undefined &&
    settings.download !== undefined
  );
}

export function mergeSettingsDomains(base: UserSettings, next: UserSettings): UserSettings {
  return create(UserSettingsSchema, {
    ...base,
    search: next.search ?? base.search,
    catalog: next.catalog ?? base.catalog,
    download: next.download ?? base.download,
  });
}

function resetChangedCatalogSourceQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  context: SettingsSaveContext | undefined,
  saved: UserSettings,
) {
  if (!context?.previousSettings) return;

  const previousSettings = toCatalogAppSettings(context.previousSettings);
  const savedSettings = toCatalogAppSettings(saved);
  if (previousSettings.moviesSource !== savedSettings.moviesSource) {
    void queryClient.resetQueries({ queryKey: ["movies"] });
  }
  if (previousSettings.tvShowsSource !== savedSettings.tvShowsSource) {
    void queryClient.resetQueries({ queryKey: ["tv-shows"] });
  }
}

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

  async function settingsForSave(update: SettingsUpdate): Promise<UserSettings> {
    const current = queryClient.getQueryData<UserSettings>(USER_SETTINGS_QUERY_KEY);
    if (current && hasCompleteSettingsDomains(current)) {
      const next = stagedSettingsForSave(current, update);
      return hasCompleteSettingsDomains(next) ? next : mergeSettingsDomains(current, next);
    }

    const serverSettings = await api.getUserSettings();
    const next = applySettingsUpdate(serverSettings, update);
    return hasCompleteSettingsDomains(next) ? next : mergeSettingsDomains(serverSettings, next);
  }

  const mutation = useMutation<UserSettings, Error, SettingsUpdate, SettingsSaveContext>({
    mutationFn: async (update: SettingsUpdate) => {
      const settings = await settingsForSave(update);
      return api.saveUserSettings(settings);
    },
    scope: USER_SETTINGS_MUTATION_SCOPE,
    onMutate: (update) => prepareSettingsSave({ queryClient, update }),
    onSuccess: (saved, _variables, context) => {
      cacheSavedSettings({ context, queryClient, settings: saved, writeCachedSettings });

      resetChangedCatalogSourceQueries(queryClient, context, saved);
      if (downloadFolderChanged(context?.previousSettings, saved)) {
        void invalidateDownloadFolder(queryClient);
      }
    },
    onError: (_error, _variables, context) => {
      if (!settingsSaveIsCurrent({ context, queryClient })) {
        return;
      }
      void queryClient.invalidateQueries({ queryKey: USER_SETTINGS_QUERY_KEY });
    },
  });

  return {
    ...mutation,
    flush: mutation.mutate,
  };
}
