import { lazy, Suspense } from "react";
import { getRouteApi, notFound, useNavigate } from "@tanstack/react-router";

import { useMoviesQuery } from "@/catalog/queries/movies";
import { useSettingsQuery } from "@/catalog/queries/settings";
import { toCatalogAppSettings } from "@/catalog/lib/types";

const routeApi = getRouteApi("/movies/$id");

const MovieDetailModal = lazy(() =>
  import("@/catalog/components/movie-detail-modal").then((m) => ({ default: m.MovieDetailModal })),
);

function MovieDetailRoute() {
  const { id } = routeApi.useParams();
  const { source } = routeApi.useSearch();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const appSettings = configQuery.data ? toCatalogAppSettings(configQuery.data) : undefined;
  const activeSource = source ?? appSettings?.moviesSource;
  const sourceReady = source === undefined || appSettings?.moviesSource === source;
  const moviesQuery = useMoviesQuery({
    enabled: configQuery.status === "success" && sourceReady,
    source: activeSource,
  });

  const close = () => void navigate({ to: "/movies", search: (prev) => prev });

  if (configQuery.status !== "success" || moviesQuery.status !== "success") return null;
  if (moviesQuery.data.source !== activeSource) return null;

  const movie = moviesQuery.data.movies.find((m) => m.id === id);
  if (!movie) throw notFound();

  return (
    <Suspense fallback={null}>
      <MovieDetailModal movie={movie} onClose={close} />
    </Suspense>
  );
}

export { MovieDetailRoute };
