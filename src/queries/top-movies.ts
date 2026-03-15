import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/lib/api";

export function useTopMoviesQuery(enabled: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ["top-movies"],
    queryFn: ({ signal }) => api.getTopMovies(signal),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
