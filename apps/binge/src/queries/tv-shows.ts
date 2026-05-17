import { useQuery } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";
import { useSettingsQuery } from "@/queries/settings";

export function useTVShowsQuery({ enabled }: { enabled: boolean }) {
  const api = useApi();
  const settingsQuery = useSettingsQuery();
  const source = settingsQuery.data?.tvShowsSource;
  return useQuery({
    queryKey: ["tv-shows", source],
    queryFn: ({ signal }) => api.getTVShows(signal),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && source !== undefined,
  });
}

export function useTVShowDetailQuery({ imdbId, enabled }: { imdbId: string; enabled: boolean }) {
  const api = useApi();
  return useQuery({
    queryKey: ["tv-show-detail", imdbId],
    queryFn: ({ signal }) => api.getTVShowDetail(imdbId, signal),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && imdbId.trim().length > 0,
  });
}

export function useTVShowSeasonQuery({
  imdbId,
  seasonNumber,
  enabled,
}: {
  imdbId: string;
  seasonNumber: number;
  enabled: boolean;
}) {
  const api = useApi();
  return useQuery({
    queryKey: ["tv-show-season", imdbId, seasonNumber],
    queryFn: ({ signal }) => api.getTVShowSeason(imdbId, seasonNumber, signal),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && imdbId.trim().length > 0 && seasonNumber > 0,
  });
}

export function useTVShowSeasonDownloadsQuery({
  imdbId,
  seasonNumber,
  enabled,
}: {
  imdbId: string;
  seasonNumber: number;
  enabled: boolean;
}) {
  const api = useApi();
  return useQuery({
    queryKey: ["tv-show-season-downloads", imdbId, seasonNumber],
    queryFn: ({ signal }) => api.getTVShowSeasonDownloads(imdbId, seasonNumber, signal),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && imdbId.trim().length > 0 && seasonNumber > 0,
  });
}
