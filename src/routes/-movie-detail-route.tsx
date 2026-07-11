import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { MovieDetailModal } from "@/catalog/components/movie-detail-modal";
import { useMoviesQuery } from "@/catalog/queries/movies";
import { useSettingsQuery } from "@/catalog/queries/settings";
import { toCatalogAppSettings } from "@/catalog/lib/types";
import { NotFoundScreen } from "@/ui/components/not-found-screen";

const routeApi = getRouteApi("/movies/$id");

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
  if (!movie) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-app">
        <NotFoundScreen
          homeHref={source === undefined ? "/movies" : `/movies?source=${source}`}
          homeLabel="back to movies"
        />
      </div>
    );
  }

  return <MovieDetailModal movie={movie} onClose={close} />;
}

export { MovieDetailRoute };
