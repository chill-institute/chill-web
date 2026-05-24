import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import {
  tvShowDetailQueryOptions,
  tvShowSeasonDownloadsQueryOptions,
  tvShowSeasonQueryOptions,
  tvShowsQueryOptions,
} from "@/catalog/queries/options";

export function useTVShowsQuery({
  enabled = true,
  source,
}: {
  enabled?: boolean;
  source: number | undefined;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = tvShowsQueryOptions(api, source);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}

export function useTVShowDetailQuery({
  imdbId,
  enabled = true,
}: {
  imdbId: string;
  enabled?: boolean;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = tvShowDetailQueryOptions(api, imdbId);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}

export function useTVShowSeasonQuery({
  imdbId,
  seasonNumber,
  enabled = true,
}: {
  imdbId: string;
  seasonNumber: number;
  enabled?: boolean;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = tvShowSeasonQueryOptions(api, imdbId, seasonNumber);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}

export function useTVShowSeasonDownloadsQuery({
  imdbId,
  seasonNumber,
  enabled = true,
}: {
  imdbId: string;
  seasonNumber: number;
  enabled?: boolean;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = tvShowSeasonDownloadsQueryOptions(api, imdbId, seasonNumber);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}
