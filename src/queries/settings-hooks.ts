import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { invalidateDownloadFolder } from "@/auth/queries/download-folder";
import type { UserSettings } from "@/lib/types";
import { writeCachedSettings } from "@/queries/settings-cache";
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
import { userSettingsQueryOptions } from "@/queries/user-settings-options";

type ReadCachedSettings = () => UserSettings | undefined;

type SettingsSavedHandler = (options: {
  context: SettingsSaveContext | undefined;
  queryClient: QueryClient;
  saved: UserSettings;
}) => void;

export function useUserSettingsQuery(readCachedSettings: ReadCachedSettings) {
  const api = useApi();
  const auth = useAuth();

  return useQuery({
    ...userSettingsQueryOptions(api, {
      read: readCachedSettings,
      write: writeCachedSettings,
    }),
    enabled: auth.isAuthenticated,
  });
}

export function useSaveUserSettings(onSaved?: SettingsSavedHandler) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation<UserSettings, Error, SettingsUpdate, SettingsSaveContext>({
    mutationFn: (update) => saveSettings({ api, queryClient, update }),
    onMutate: (update) => prepareSettingsSave({ queryClient, update }),
    onSuccess: (saved, _update, context) => {
      if (settingsSaveIsCurrent({ context, queryClient })) {
        queryClient.setQueryData(USER_SETTINGS_QUERY_KEY, saved);
        writeCachedSettings(saved);
      }
      onSaved?.({ context, queryClient, saved });
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
}
