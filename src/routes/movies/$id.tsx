import { createFileRoute } from "@tanstack/react-router";

import { movieCatalogSearchSchema } from "@/routes/-search-params";
import { MovieDetailRoute } from "@/routes/-movie-detail-route";

export const Route = createFileRoute("/movies/$id")({
  validateSearch: movieCatalogSearchSchema,
  component: MovieDetailRoute,
});
