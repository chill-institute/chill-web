import { lazy, Suspense } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTVShowsQuery } from "@/queries/tv-shows";
import { useSettingsQuery } from "@/queries/settings";
import { parseSortKey, parseTVShowsSource, type SortKey } from "@/components/catalog-page";
import { toBingeSettings } from "@/lib/types";

type Search = {
  season?: number;
  sort?: SortKey;
  source?: number;
};

function parseSeason(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

const TvShowDetailModal = lazy(() =>
  import("@/components/tv-show-detail-modal").then((m) => ({ default: m.TvShowDetailModal })),
);

export const Route = createFileRoute("/tv-shows/$id")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    season: parseSeason(search.season),
    sort: parseSortKey(search.sort),
    source:
      typeof search.source === "number" || typeof search.source === "string"
        ? (parseTVShowsSource(String(search.source)) ?? undefined)
        : undefined,
  }),
  component: TVShowDetailRoute,
});

function TVShowDetailRoute() {
  const { id } = Route.useParams();
  const { season } = Route.useSearch();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const tvShowsQuery = useTVShowsQuery({
    enabled: configQuery.status === "success",
  });

  const close = () => void navigate({ to: "/tv-shows", search: (prev) => prev });
  const setSeason = (next: number) =>
    void navigate({
      to: "/tv-shows/$id",
      params: { id },
      search: (prev) => ({ ...prev, season: next }),
      replace: true,
    });

  const fallbackShow =
    configQuery.status === "success" &&
    tvShowsQuery.status === "success" &&
    tvShowsQuery.data.source === toBingeSettings(configQuery.data).tvShowsSource
      ? tvShowsQuery.data.shows.find((show) => show.imdbId === id)
      : undefined;

  return (
    <Suspense fallback={null}>
      <TvShowDetailModal
        imdbId={id}
        fallbackShow={fallbackShow}
        activeSeason={season}
        onSeasonChange={setSeason}
        onClose={close}
      />
    </Suspense>
  );
}
