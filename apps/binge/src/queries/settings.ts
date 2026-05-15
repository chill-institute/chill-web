import { useEffect, useRef, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";
import { invalidateDownloadFolder } from "@chill-institute/auth/queries/download-folder";
import { normalizeBingeUserSettings, type UserSettings } from "@/lib/types";
import { readCachedSettings, writeCachedSettings } from "@/queries/options";

const SAVE_DEBOUNCE_MS = 500;

type RefreshFlag = "movies" | "tv-shows";

const refreshState: Record<RefreshFlag, boolean> = { movies: false, "tv-shows": false };
const refreshListeners = new Set<() => void>();

function setRefresh(flag: RefreshFlag, value: boolean): void {
  if (refreshState[flag] === value) return;
  refreshState[flag] = value;
  for (const listener of refreshListeners) listener();
}

function subscribeRefresh(listener: () => void): () => void {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

function getMoviesRefreshSnapshot(): boolean {
  return refreshState.movies;
}

function getTVShowsRefreshSnapshot(): boolean {
  return refreshState["tv-shows"];
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

export function usePendingMoviesRefresh(): boolean {
  return useSyncExternalStore(subscribeRefresh, getMoviesRefreshSnapshot, getMoviesRefreshSnapshot);
}

export function usePendingTVShowsRefresh(): boolean {
  return useSyncExternalStore(
    subscribeRefresh,
    getTVShowsRefreshSnapshot,
    getTVShowsRefreshSnapshot,
  );
}

export function useSaveSettings() {
  const api = useApi();
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<UserSettings | null>(null);
  const previousRef = useRef<UserSettings | null>(null);
  const mutateRef = useRef<((next: UserSettings) => void) | null>(null);

  const mutation = useMutation({
    mutationFn: (next: UserSettings) => api.saveUserSettings(next),
    onSuccess: (_data, variables) => {
      const prev = previousRef.current;
      if (prev && prev.moviesSource !== variables.moviesSource) {
        void queryClient.resetQueries({ queryKey: ["movies"] });
      }
      if (prev && prev.tvShowsSource !== variables.tvShowsSource) {
        void queryClient.resetQueries({ queryKey: ["tv-shows"] });
      }
      if (prev && prev.downloadFolderId !== variables.downloadFolderId) {
        void invalidateDownloadFolder(queryClient);
      }
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-settings"] });
    },
    onSettled: () => {
      previousRef.current = null;
      pendingRef.current = null;
      setRefresh("movies", false);
      setRefresh("tv-shows", false);
    },
  });

  mutateRef.current = mutation.mutate;

  useEffect(
    () => () => {
      if (pendingRef.current) {
        mutateRef.current?.(pendingRef.current);
      }
      clearTimeout(debounceRef.current);
    },
    [],
  );

  return {
    ...mutation,
    mutate: (next: UserSettings) => {
      const normalizedNext = normalizeBingeUserSettings(next);
      const current = queryClient.getQueryData<UserSettings>(["user-settings"]);
      if (pendingRef.current === null && current) {
        previousRef.current = current;
      }
      if (previousRef.current) {
        setRefresh("movies", previousRef.current.moviesSource !== normalizedNext.moviesSource);
        setRefresh("tv-shows", previousRef.current.tvShowsSource !== normalizedNext.tvShowsSource);
      }
      queryClient.setQueryData(["user-settings"], normalizedNext);
      writeCachedSettings(normalizedNext);
      pendingRef.current = normalizedNext;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => mutation.mutate(normalizedNext), SAVE_DEBOUNCE_MS);
    },
  };
}
