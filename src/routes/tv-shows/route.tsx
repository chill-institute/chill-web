import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage, parseTVShowsSource } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";

type Search = {
  source?: number;
};

export const Route = createFileRoute("/tv-shows")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseTVShowsSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
    void queryClient.prefetchQuery(settingsQueryOptions(token));
  },
  component: TVShowsLayout,
});

function TVShowsLayout() {
  const { source } = Route.useSearch();
  return (
    <>
      <CatalogPage tab="tv-shows" source={source} />
      <Outlet />
    </>
  );
}
