import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@/auth/auth";

import { CatalogPage, parseMoviesSource } from "@/catalog/components/catalog-page";
import { settingsQueryOptions } from "@/catalog/queries/options";

type Search = {
  source?: number;
};

export const Route = createFileRoute("/movies")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseMoviesSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
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
