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
  return useQuery(moviesQueryOptions(api, source, auth.isAuthenticated && enabled));
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
  return useQuery(movieSearchQueryOptions(api, movie, auth.isAuthenticated && enabled));
}
