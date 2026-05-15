import { useQuery } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";

export function useFreeSearchQuery({ query, enabled }: { query: string; enabled: boolean }) {
  const api = useApi();
  return useQuery({
    queryKey: ["free-search", query],
    queryFn: ({ signal }) => api.search(query, undefined, signal),
    staleTime: 60 * 1000,
    enabled: enabled && query.trim().length > 0,
  });
}
