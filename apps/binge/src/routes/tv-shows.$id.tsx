import { createFileRoute } from "@tanstack/react-router";

import { readStoredToken } from "@chill-institute/auth/auth";

import { CatalogPage, parseSortKey, parseTVShowsSource } from "@/components/catalog-page";
import { settingsQueryOptions, tvShowsQueryOptions } from "@/queries/options";

type Search = {
  sort?: "popular" | "rating" | "recent";
  source?: number;
  season?: number;
};

function parseSeason(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export const Route = createFileRoute("/tv-shows/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    sort: parseSortKey(search.sort),
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseTVShowsSource(String(search.source)) ?? undefined)
        : undefined,
    season: parseSeason(search.season),
  }),
  loader: ({ context: { queryClient } }) => {
    const token = readStoredToken();
    if (!token) return;
    const settingsPromise = queryClient.ensureQueryData(settingsQueryOptions(token));
    void settingsPromise.then(() => {
      void queryClient.ensureQueryData(tvShowsQueryOptions(token));
    });
  },
  component: TVShowDetailRoute,
});

function TVShowDetailRoute() {
  const { id } = Route.useParams();
  const { sort = "popular", source, season } = Route.useSearch();
  return (
    <CatalogPage
      tab="tv-shows"
      sort={sort}
      source={source}
      selectedShowId={id}
      selectedSeason={season}
    />
  );
}
