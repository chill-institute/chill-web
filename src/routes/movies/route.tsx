import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { syncMovieSourceFromSearch } from "@/catalog/queries/source-sync";
import { MoviesError, reportMoviesError } from "@/routes/-movies-error";
import { movieCatalogSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/movies")({
  validateSearch: movieCatalogSearchSchema,
  loaderDeps: ({ search }) => ({ source: search.source }),
  loader: async ({ context: { queryClient }, deps: { source } }) => {
    const token = readStoredToken();
    if (!token) return;
    // Persist URL source preference without blocking catalog render on put.io latency.
    void syncMovieSourceFromSearch({ queryClient, source, token }).catch(reportMoviesError);
    void queryClient.prefetchQuery(settingsQueryOptions(token));
  },
  onError: reportMoviesError,
  errorComponent: MoviesError,
  component: MoviesLayout,
});

function MoviesLayout() {
  return (
    <>
      <CatalogPage tab="movies" />
      <Outlet />
    </>
  );
}
