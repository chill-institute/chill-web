import { Outlet, createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@chill-institute/auth/auth";

import { CatalogPage, parseMoviesSource, parseSortKey } from "@/components/catalog-page";
import { settingsQueryOptions } from "@/queries/options";

type Search = {
  sort?: "popular" | "rating" | "recent";
  source?: number;
};

export const Route = createFileRoute("/movies")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    sort: parseSortKey(search.sort),
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseMoviesSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
    void queryClient.ensureQueryData(settingsQueryOptions(token));
  },
  component: MoviesLayout,
});

function MoviesLayout() {
  const { sort = "popular", source } = Route.useSearch();
  return (
    <>
      <CatalogPage tab="movies" sort={sort} source={source} />
      <Outlet />
    </>
  );
}
