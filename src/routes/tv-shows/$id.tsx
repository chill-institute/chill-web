import { createFileRoute } from "@tanstack/react-router";

import { parseTVShowsSource } from "@/catalog/lib/types";
import { parseSeason } from "@/routes/-parse-season";
import { TVShowDetailRoute } from "@/routes/-tv-show-detail-route";

type Search = {
  season?: number;
  source?: number;
};

export const Route = createFileRoute("/tv-shows/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    season: parseSeason(search.season),
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseTVShowsSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  component: TVShowDetailRoute,
});
