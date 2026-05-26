import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { syncCatalogSourceFromSearch } from "@/catalog/queries/source-sync";
import { tvShowsCatalogSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/tv-shows")({
  validateSearch: tvShowsCatalogSearchSchema,
  loaderDeps: ({ search }) => ({ source: search.source }),
  loader: async ({ context: { queryClient }, deps: { source } }) => {
    const token = readStoredToken();
    if (!token) return;
    await syncCatalogSourceFromSearch({ queryClient, source, tab: "tv-shows", token });
    void queryClient.prefetchQuery(settingsQueryOptions(token));
  },
  component: TVShowsLayout,
});

function TVShowsLayout() {
  return (
    <>
      <CatalogPage tab="tv-shows" />
      <Outlet />
    </>
  );
}
