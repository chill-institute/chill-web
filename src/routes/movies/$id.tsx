import { lazy, Suspense } from "react";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import { useMoviesQuery } from "@/catalog/queries/movies";
import { useSettingsQuery } from "@/catalog/queries/settings";
import { toCatalogAppSettings } from "@/catalog/lib/types";

const MovieDetailModal = lazy(() =>
  import("@/catalog/components/movie-detail-modal").then((m) => ({ default: m.MovieDetailModal })),
);

export const Route = createFileRoute("/movies/$id")({
  component: MovieDetailRoute,
});

function MovieDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const moviesQuery = useMoviesQuery({
    enabled: configQuery.status === "success",
  });

  const close = () => void navigate({ to: "/movies", search: (prev) => prev });

  if (configQuery.status !== "success" || moviesQuery.status !== "success") return null;
  if (moviesQuery.data.source !== toCatalogAppSettings(configQuery.data).moviesSource) return null;

  const movie = moviesQuery.data.movies.find((m) => m.id === id);
  if (!movie) throw notFound();

  return (
    <Suspense fallback={null}>
      <MovieDetailModal movie={movie} onClose={close} />
    </Suspense>
  );
}
