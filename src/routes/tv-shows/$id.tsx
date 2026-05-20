import { lazy, Suspense } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { useTVShowsQuery } from "@/catalog/queries/tv-shows";
import { useSettingsQuery } from "@/catalog/queries/settings";
import { parseTVShowsSource } from "@/catalog/components/catalog-page";
import { toCatalogAppSettings } from "@/catalog/lib/types";

type Search = {
  season?: number;
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
  import("@/catalog/components/tv-show-detail-modal").then((m) => ({
    default: m.TvShowDetailModal,
  })),
);

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

function TVShowDetailRoute() {
  const { id } = Route.useParams();
  const { season, source } = Route.useSearch();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const appSettings = configQuery.data ? toCatalogAppSettings(configQuery.data) : undefined;
  const activeSource = source ?? appSettings?.tvShowsSource;
  const sourceReady = source === undefined || appSettings?.tvShowsSource === source;
  const tvShowsQuery = useTVShowsQuery({
    enabled: configQuery.status === "success" && sourceReady,
    source: activeSource,
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
    tvShowsQuery.data.source === activeSource
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
