import { useQuery } from "@tanstack/react-query";

import { useApi } from "@/auth/api-context";
import { type Movie } from "@/catalog/lib/types";
import { movieSearchQueryOptions, moviesQueryOptions } from "@/catalog/queries/options";

export function useMoviesQuery({
  enabled,
  source,
}: {
  enabled: boolean;
  source: number | undefined;
}) {
  const api = useApi();
  return useQuery({ ...moviesQueryOptions(api, source), enabled: enabled && source !== undefined });
}

export function useMovieSearchQuery({ movie, enabled }: { movie: Movie; enabled: boolean }) {
  const api = useApi();
  const query = [movie.title, movie.year].filter(Boolean).join(" ").trim();

  return useQuery({ ...movieSearchQueryOptions(api, movie), enabled: enabled && query.length > 0 });
}
