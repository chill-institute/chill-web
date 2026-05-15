import { createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@chill-institute/auth/auth";

import { CatalogPage, parseSortKey, parseTVShowsSource } from "@/components/catalog-page";
import { settingsQueryOptions, tvShowsQueryOptions } from "@/queries/options";

type Search = {
  sort?: "popular" | "rating" | "recent";
  source?: number;
};

export const Route = createFileRoute("/tv-shows")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    sort: parseSortKey(search.sort),
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseTVShowsSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
    const settingsPromise = queryClient.ensureQueryData(settingsQueryOptions(token));
    void settingsPromise.then(() => {
      void queryClient.ensureQueryData(tvShowsQueryOptions(token));
    });
  },
  component: TVShowsRoute,
});

function TVShowsRoute() {
  const { sort = "popular", source } = Route.useSearch();
  return <CatalogPage tab="tv-shows" sort={sort} source={source} />;
}
