import { Code, ConnectError } from "@connectrpc/connect";
import { getRouteApi, useNavigate } from "@tanstack/react-router";

import { TVShowsSource } from "@chill-institute/contracts/chill/v4/api_pb";

import { TvShowDetailModal } from "@/catalog/components/tv-show-detail-modal";
import { useTVShowDetailQuery, useTVShowsQuery } from "@/catalog/queries/tv-shows";
import { useSettingsQuery } from "@/catalog/queries/settings";
import { NotFoundScreen } from "@/ui/components/not-found-screen";

const routeApi = getRouteApi("/tv-shows/$id");

function TVShowDetailRoute() {
  const { id } = routeApi.useParams();
  const { season, source } = routeApi.useSearch();
  const navigate = useNavigate();

  const configQuery = useSettingsQuery();
  const activeSource = source ?? TVShowsSource.TV_SHOWS_SOURCE_ALL_PROVIDERS;
  const tvShowsQuery = useTVShowsQuery({
    enabled: configQuery.status === "success",
    source: activeSource,
  });
  const detailQuery = useTVShowDetailQuery({ imdbId: id });

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

  if (
    (detailQuery.status === "success" && !detailQuery.data.show) ||
    (detailQuery.error instanceof ConnectError && detailQuery.error.code === Code.NotFound)
  ) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-app">
        <NotFoundScreen
          homeHref={source === undefined ? "/tv-shows" : `/tv-shows?source=${source}`}
          homeLabel="back to tv shows"
        />
      </div>
    );
  }

  return (
    <TvShowDetailModal
      imdbId={id}
      fallbackShow={fallbackShow}
      activeSeason={season}
      onSeasonChange={setSeason}
      onClose={close}
    />
  );
}

export { TVShowDetailRoute };
