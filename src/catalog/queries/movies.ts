import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { useAuth } from "@/auth/auth";
import { type Movie } from "@/catalog/lib/types";
import { movieSearchQueryOptions, moviesQueryOptions } from "@/catalog/queries/options";

export function useMoviesQuery({
  enabled = true,
  source,
}: {
  enabled?: boolean;
  source: number | undefined;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = moviesQueryOptions(api, source);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}

export function useMovieSearchQuery({
  movie,
  enabled = true,
}: {
  movie: Movie;
  enabled?: boolean;
}) {
  const api = useApi();
  const auth = useAuth();
  const options = movieSearchQueryOptions(api, movie);

  return useQuery({
    ...options,
    enabled: auth.isAuthenticated && enabled && options.enabled,
  });
}
