import { lazy, Suspense } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useMoviesQuery } from "@/queries/movies";
import { useSettingsQuery } from "@/queries/settings";

const MovieDetailModal = lazy(() =>
  import("@/components/movie-detail-modal").then((m) => ({ default: m.MovieDetailModal })),
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

  const movie =
    configQuery.status === "success" &&
    moviesQuery.status === "success" &&
    moviesQuery.data.source === configQuery.data.moviesSource
      ? moviesQuery.data.movies.find((m) => m.id === id)
      : undefined;

  if (!movie) return null;

  return (
    <Suspense fallback={null}>
      <MovieDetailModal movie={movie} onClose={close} />
    </Suspense>
  );
}
