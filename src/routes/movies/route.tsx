import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { syncMovieSourceFromSearch } from "@/catalog/queries/source-sync";
import { movieCatalogSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/movies")({
  validateSearch: movieCatalogSearchSchema,
  loaderDeps: ({ search }) => ({ source: search.source }),
  loader: async ({ context: { queryClient }, deps: { source } }) => {
    const token = readStoredToken();
    if (!token) return;
    await syncMovieSourceFromSearch({ queryClient, source, token });
    void queryClient.prefetchQuery(settingsQueryOptions(token));
  },
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
