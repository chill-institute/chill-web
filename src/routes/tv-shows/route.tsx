import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";
import { tvShowsCatalogSearchSchema } from "@/routes/-search-params";

export const Route = createFileRoute("/tv-shows")({
  validateSearch: tvShowsCatalogSearchSchema,
  loader: async ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
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
