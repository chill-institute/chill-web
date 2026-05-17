import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";
import { invalidateDownloadFolder } from "@chill-institute/auth/queries/download-folder";
import { toBingeSettings, type UserSettings } from "@/lib/types";
import { readCachedSettings, writeCachedSettings } from "@/queries/options";

const SAVE_DEBOUNCE_MS = 500;

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

  const mutation = useMutation({
    mutationFn: (next: UserSettings) => api.saveUserSettings(next),
    onSuccess: (_data, variables) => {
      const prev = previousRef.current;
      const prevSettings = prev ? toBingeSettings(prev) : null;
      const nextSettings = toBingeSettings(variables);
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
