import { createFileRoute } from "@tanstack/react-router";

import { parseMoviesSource } from "@/catalog/lib/types";
import { MovieDetailRoute } from "@/routes/-movie-detail-route";

type Search = {
  source?: number;
};

export const Route = createFileRoute("/movies/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseMoviesSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  component: MovieDetailRoute,
});
