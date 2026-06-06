import { useQuery } from "@tanstack/react-query";
import type { TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

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
  source: TVShowsSource | undefined;
}) {
  const api = useApi();
  const auth = useAuth();
  return useQuery(tvShowsQueryOptions(api, source, auth.isAuthenticated && enabled));
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
  return useQuery(tvShowDetailQueryOptions(api, imdbId, auth.isAuthenticated && enabled));
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
  return useQuery(
    tvShowSeasonQueryOptions(api, imdbId, seasonNumber, auth.isAuthenticated && enabled),
  );
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
  return useQuery(
    tvShowSeasonDownloadsQueryOptions(api, imdbId, seasonNumber, auth.isAuthenticated && enabled),
  );
}
