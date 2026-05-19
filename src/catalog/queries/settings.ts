import { useEffect, useRef } from "react";
import { create } from "@bufbuild/protobuf";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserSettingsSchema } from "@chill-institute/contracts/chill/v4/api_pb";

import { useApi } from "@/auth/api-context";
import { invalidateDownloadFolder } from "@/auth/queries/download-folder";
import { toCatalogAppSettings, type UserSettings } from "@/catalog/lib/types";
import { readCachedSettings, writeCachedSettings } from "@/catalog/queries/options";

const SAVE_DEBOUNCE_MS = 500;

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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<UserSettings | null>(null);
  const previousRef = useRef<UserSettings | null>(null);

  async function settingsForSave(next: UserSettings): Promise<UserSettings> {
    if (hasCompleteSettingsDomains(next)) {
      return next;
    }

    const current = queryClient.getQueryData<UserSettings>(["user-settings"]);
    if (current && hasCompleteSettingsDomains(current)) {
      return mergeSettingsDomains(current, next);
    }

    return mergeSettingsDomains(await api.getUserSettings(), next);
  }

  const mutation = useMutation({
    mutationFn: async (next: UserSettings) => api.saveUserSettings(await settingsForSave(next)),
    onSuccess: (data, variables) => {
      if (pendingRef.current !== variables) {
        return;
      }
      queryClient.setQueryData(["user-settings"], data);
      writeCachedSettings(data);
      const prev = previousRef.current;
      const prevSettings = prev ? toCatalogAppSettings(prev) : null;
      const nextSettings = toCatalogAppSettings(data);
      if (prevSettings && prevSettings.moviesSource !== nextSettings.moviesSource) {
        void queryClient.resetQueries({ queryKey: ["movies"] });
      }
      if (prevSettings && prevSettings.tvShowsSource !== nextSettings.tvShowsSource) {
        void queryClient.resetQueries({ queryKey: ["tv-shows"] });
      }
      if (prevSettings && prevSettings.download.folderId !== nextSettings.download.folderId) {
        void invalidateDownloadFolder(queryClient);
      }
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onSettled: (_data, _error, variables) => {
      if (pendingRef.current === variables) {
        previousRef.current = null;
        pendingRef.current = null;
      }
    },
  });

  const flushRef = useRef(mutation.mutate);
  useEffect(() => {
    flushRef.current = mutation.mutate;
  });

  useEffect(
    () => () => {
      if (pendingRef.current) {
        flushRef.current(pendingRef.current);
      }
      clearTimeout(debounceRef.current);
    },
    [],
  );

  function stageSettings(next: UserSettings) {
    const current = queryClient.getQueryData<UserSettings>(["user-settings"]);
    if (pendingRef.current === null && current) {
      previousRef.current = current;
    }
    queryClient.setQueryData(["user-settings"], next);
    writeCachedSettings(next);
    pendingRef.current = next;
    return next;
  }

  return {
    ...mutation,
    mutate: (next: UserSettings) => {
      const normalizedNext = stageSettings(next);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => mutation.mutate(normalizedNext), SAVE_DEBOUNCE_MS);
    },
    flush: (next: UserSettings) => {
      const normalizedNext = stageSettings(next);
      clearTimeout(debounceRef.current);
      mutation.mutate(normalizedNext);
    },
  };
}
