import { queryOptions } from "@tanstack/react-query";

import type { ChillApi } from "@/api/api";
import { FIVE_MINUTES } from "@/queries/user-settings-options";

export const BINGES_QUERY_KEY = ["binges"] as const;

export function bingesQueryOptions(api: ChillApi, enabled = true) {
  return queryOptions({
    queryKey: BINGES_QUERY_KEY,
    queryFn: ({ signal }) => api.listBinges(signal),
    staleTime: FIVE_MINUTES,
    enabled,
  });
}

export function bingeQueryOptions(api: ChillApi, id: string, enabled = true) {
  return queryOptions({
    queryKey: [...BINGES_QUERY_KEY, id] as const,
    queryFn: ({ signal }) => api.getBinge(id, signal),
    staleTime: FIVE_MINUTES,
    enabled: enabled && id.length > 0,
  });
}
