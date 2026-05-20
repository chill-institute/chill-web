import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import {
  tvShowDetailQueryOptions,
  tvShowSeasonDownloadsQueryOptions,
  tvShowSeasonQueryOptions,
  tvShowsQueryOptions,
} from "@/catalog/queries/options";

export function useTVShowsQuery({
  enabled,
  source,
}: {
  enabled: boolean;
  source: number | undefined;
}) {
  const api = useApi();
  return useQuery({
    ...tvShowsQueryOptions(api, source),
    enabled: enabled && source !== undefined,
  });
}

export function useTVShowDetailQuery({ imdbId, enabled }: { imdbId: string; enabled: boolean }) {
  const api = useApi();
  return useQuery({
    ...tvShowDetailQueryOptions(api, imdbId),
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
    ...tvShowSeasonQueryOptions(api, imdbId, seasonNumber),
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
    ...tvShowSeasonDownloadsQueryOptions(api, imdbId, seasonNumber),
    enabled: enabled && imdbId.trim().length > 0 && seasonNumber > 0,
  });
}
