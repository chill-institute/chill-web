import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { syncCatalogSourceFromSearch } from "@/catalog/queries/source-sync";
import { movieCatalogSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/movies")({
  validateSearch: movieCatalogSearchSchema,
  loaderDeps: ({ search }) => ({ source: search.source }),
  loader: async ({ context: { queryClient }, deps: { source } }) => {
    const token = readStoredToken();
    if (!token) return;
    await syncCatalogSourceFromSearch({ queryClient, source, tab: "movies", token });
    void queryClient.prefetchQuery(settingsQueryOptions(token));
  },
  component: MoviesLayout,
});

function MoviesLayout() {
  const { source } = Route.useSearch();
  return (
    <>
      <CatalogPage tab="movies" source={source} />
      <Outlet />
    </>
  );
}
