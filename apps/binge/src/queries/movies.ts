import { useQuery } from "@tanstack/react-query";

import { useApi } from "@chill-institute/auth/api-context";
import { type Movie } from "@/lib/types";
import { useSettingsQuery } from "@/queries/settings";

export function useMoviesQuery({ enabled }: { enabled: boolean }) {
  const api = useApi();
  const settingsQuery = useSettingsQuery();
  const source = settingsQuery.data?.moviesSource;
  return useQuery({
    queryKey: ["movies", source],
    queryFn: ({ signal }) => api.getMovies(signal),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && source !== undefined,
  });
}

export function useMovieSearchQuery({ movie, enabled }: { movie: Movie; enabled: boolean }) {
  const api = useApi();
  const query = [movie.title, movie.year].filter(Boolean).join(" ").trim();

  return useQuery({
    queryKey: ["movie-search", movie.id, query],
    queryFn: ({ signal }) => api.search(query, undefined, signal),
    staleTime: 60 * 1000,
    enabled: enabled && query.length > 0,
  });
}
