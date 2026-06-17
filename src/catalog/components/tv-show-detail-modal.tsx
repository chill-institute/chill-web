import { useMemo } from "react";
import { CloudUpload, Loader2 } from "lucide-react";

import { AddTransferButton } from "@/auth/components/add-transfer-button";
import { TVShowStatusBadge } from "@/catalog/components/tv-show-status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/ui/components/ui/tabs";
import { Button } from "@/ui/components/ui/button";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";
import { useIsDesktop } from "@/ui/hooks/use-is-desktop";
import { formatBytes } from "@/ui/lib/format";
import { type TVShow } from "@/catalog/lib/types";
import {
  DetailModalBody,
  DetailExternalLinkMeta,
  DetailGenreBadges,
  DetailModalHeader,
  DetailModalHeaderSkeleton,
  DetailModalHeaderText,
  DetailMetadataSeparator,
  DetailModalShell,
  DetailRatingMeta,
  DetailResponsiveModal,
  DetailYearMeta,
  getDetailGenreTags,
} from "@/catalog/components/detail-modal";
import {
  useTVShowDetailQuery,
  useTVShowSeasonDownloadsQuery,
  useTVShowSeasonQuery,
} from "@/catalog/queries/tv-shows";

const SEASON_TAB_SKELETON_SLOTS = Array.from({ length: 3 }, (_, i) => `season-tab-skel-${i}`);
const EPISODE_SKELETON_SLOTS = Array.from({ length: 6 }, (_, i) => `episode-skel-${i}`);
const EMPTY_SEASONS: NonNullable<ReturnType<typeof useTVShowDetailQuery>["data"]>["seasons"] = [];
const EMPTY_GENRES: string[] = [];

const AIR_DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

type Props = {
  imdbId: string;
  fallbackShow?: TVShow;
  activeSeason?: number;
  onSeasonChange: (season: number) => void;
  onClose: () => void;
};

function formatAirDate(value?: string) {
  if (!value) {
    return "TBA";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return AIR_DATE_FORMATTER.format(date);
}

function EpisodeActionSkeleton() {
  return <Skeleton className="size-8 shrink-0 rounded" />;
}

function SeasonSummarySkeleton() {
  return (
    <div
      className="border-border-soft bg-surface-2 mb-4 flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between"
      aria-hidden="true"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-8 w-full rounded sm:w-40" />
    </div>
  );
}

type DetailData = NonNullable<ReturnType<typeof useTVShowDetailQuery>["data"]>;
type SeasonData = NonNullable<ReturnType<typeof useTVShowSeasonQuery>["data"]>;
type SeasonDownloadsData = NonNullable<ReturnType<typeof useTVShowSeasonDownloadsQuery>["data"]>;

type ContentProps = {
  isDesktop: boolean;
  show?: TVShow | DetailData["show"];
  genres: string[];
  backdropUrl?: string;
  posterUrl?: string;
  detailQuery: ReturnType<typeof useTVShowDetailQuery>;
  downloadsQuery: ReturnType<typeof useTVShowSeasonDownloadsQuery>;
  seasonQuery: ReturnType<typeof useTVShowSeasonQuery>;
  seasons: DetailData["seasons"];
  resolvedSeasonNumber: number;
  selectedSeason?: SeasonData["season"] | DetailData["seasons"][number];
  downloadsByEpisode: Map<number, SeasonDownloadsData["episodes"][number]["download"]>;
  onClose: () => void;
  onSeasonChange: (season: number) => void;
};

function TvShowDetailContent({
  isDesktop,
  show,
  genres,
  backdropUrl,
  posterUrl,
  detailQuery,
  downloadsQuery,
  seasonQuery,
  seasons,
  resolvedSeasonNumber,
  selectedSeason,
  downloadsByEpisode,
  onClose,
  onSeasonChange,
}: ContentProps) {
  const seasonRefreshing =
    (seasonQuery.isFetching && seasonQuery.status === "success") ||
    (downloadsQuery.isFetching && downloadsQuery.status === "success");
  const visibleGenres = getDetailGenreTags(genres);
  const headerMetadata = useMemo(
    () =>
      show ? (
        <>
          <DetailRatingMeta rating={show.rating} />
          <DetailYearMeta year={show.year} />
          <DetailMetadataSeparator />
          <span className="text-fg-3">
            {detailQuery.data?.show?.seasonCount ?? show.seasonCount} seasons
          </span>
          <DetailExternalLinkMeta url={show.externalUrl} />
        </>
      ) : null,
    [detailQuery.data?.show?.seasonCount, show],
  );

  return (
    <DetailModalShell isDesktop={isDesktop}>
      <DetailModalHeader
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        posterAlt={show?.title ?? "TV show poster"}
        closeLabel="Close TV show details"
        onClose={onClose}
      >
        {show ? (
          <DetailModalHeaderText
            titleId="tv-show-detail-title"
            title={show.title}
            metadata={headerMetadata}
          >
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TVShowStatusBadge status={detailQuery.data?.show?.status ?? show.status} />
              {visibleGenres.length > 0 ? (
                <>
                  <DetailMetadataSeparator />
                  <DetailGenreBadges genres={visibleGenres} />
                </>
              ) : null}
            </div>
          </DetailModalHeaderText>
        ) : (
          <DetailModalHeaderSkeleton />
        )}
      </DetailModalHeader>

      <DetailModalBody>
        {detailQuery.status === "error" ? <UserErrorAlert error={detailQuery.error} /> : null}

        <div
          className={cn(
            "transition-opacity duration-base ease-out",
            seasonRefreshing ? "opacity-75" : "opacity-100",
          )}
        >
          {seasons.length > 1 ? (
            <Tabs
              value={String(resolvedSeasonNumber)}
              onValueChange={(value) => {
                const next = Number.parseInt(value, 10);
                if (Number.isFinite(next)) onSeasonChange(next);
              }}
            >
              <TabsList className="mb-4 max-w-full overflow-x-auto">
                {seasons.map((season) => (
                  <TabsTrigger
                    key={season.seasonNumber}
                    value={String(season.seasonNumber)}
                    className="shrink-0"
                  >
                    {season.name || `season ${season.seasonNumber}`}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : detailQuery.isPending ? (
            <div className="mb-4 flex gap-1">
              {SEASON_TAB_SKELETON_SLOTS.map((slot) => (
                <Skeleton key={slot} className="h-6 w-16" />
              ))}
            </div>
          ) : null}

          {selectedSeason ? (
            <div className="border-border-soft bg-surface-2 mb-4 flex flex-col gap-3 rounded border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-normal">
                  {selectedSeason.name || `Season ${selectedSeason.seasonNumber}`}
                </div>
                <div className="mt-1 text-xs text-fg-3">
                  {selectedSeason.episodeCount} episodes
                  <span className="mx-1.5">·</span>
                  {formatAirDate(selectedSeason.airDate)}
                  {downloadsQuery.data?.seasonPack?.resolution ? (
                    <>
                      <span className="mx-1.5">·</span>
                      {downloadsQuery.data.seasonPack.resolution}
                    </>
                  ) : null}
                  {downloadsQuery.data?.seasonPack?.size ? (
                    <>
                      <span className="mx-1.5">·</span>
                      {formatBytes(downloadsQuery.data.seasonPack.size)}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-nowrap">
                {downloadsQuery.isPending ? (
                  <Button disabled className="w-full sm:w-auto">
                    <Loader2 data-icon="inline-start" className="motion-safe:animate-spin" />
                    <span>loading downloads</span>
                  </Button>
                ) : downloadsQuery.status === "error" ? null : downloadsQuery.data?.seasonPack
                    ?.link ? (
                  <AddTransferButton
                    className="w-full sm:w-auto"
                    url={downloadsQuery.data.seasonPack.link}
                    ariaLabel={`Send ${show?.title ?? "TV show"} season ${resolvedSeasonNumber} to put.io`}
                  >
                    send season to put.io
                  </AddTransferButton>
                ) : (
                  <Button variant="off" disabled className="w-full sm:w-auto">
                    <CloudUpload data-icon="inline-start" />
                    <span>season pack unavailable</span>
                  </Button>
                )}
              </div>
            </div>
          ) : detailQuery.isPending ? (
            <SeasonSummarySkeleton />
          ) : null}

          {downloadsQuery.status === "error" ? (
            <UserErrorAlert className="mb-3" error={downloadsQuery.error} />
          ) : null}

          {seasonQuery.status === "error" ? (
            <UserErrorAlert error={seasonQuery.error} />
          ) : seasonQuery.isPending ? (
            <div className="border-border-soft bg-surface-2 overflow-hidden rounded border">
              {EPISODE_SKELETON_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="border-border-faint flex items-center gap-3 border-t px-3 py-2.5 first:border-t-0"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <EpisodeActionSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className="border-border-soft bg-surface-2 overflow-hidden rounded border">
              {(seasonQuery.data?.episodes ?? []).map((episode) => {
                const episodeDownload = downloadsByEpisode.get(episode.episodeNumber);
                const paddedEpisode = String(episode.episodeNumber).padStart(2, "0");

                return (
                  <div
                    key={`${episode.seasonNumber}-${episode.episodeNumber}`}
                    className="border-border-faint flex items-center gap-3 border-t px-3 py-2.5 first:border-t-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-normal text-fg-1">
                        {episode.name || `episode ${episode.episodeNumber}`}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-fg-4">
                        <span className="tabular-nums">E{paddedEpisode}</span>
                        <span>· {formatAirDate(episode.airDate)}</span>
                        {episode.runtime ? <span>· {episode.runtime}m</span> : null}
                        {episode.rating ? <span>· ★ {episode.rating.toFixed(1)}</span> : null}
                        {episodeDownload?.resolution ? (
                          <span className="tabular-nums">· {episodeDownload.resolution}</span>
                        ) : null}
                        {episodeDownload?.size ? (
                          <span className="tabular-nums">
                            · {formatBytes(episodeDownload.size)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {downloadsQuery.isPending ? (
                        <EpisodeActionSkeleton />
                      ) : downloadsQuery.status === "error" ? null : episodeDownload?.link ? (
                        <AddTransferButton
                          url={episodeDownload.link}
                          ariaLabel={`Send ${show?.title ?? "TV show"} season ${episode.seasonNumber} episode ${episode.episodeNumber} to put.io`}
                        >
                          <CloudUpload />
                        </AddTransferButton>
                      ) : (
                        <Button variant="off" disabled>
                          <CloudUpload />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DetailModalBody>
    </DetailModalShell>
  );
}

export function TvShowDetailModal({
  imdbId,
  fallbackShow,
  activeSeason,
  onSeasonChange,
  onClose,
}: Props) {
  const isDesktop = useIsDesktop();
  const detailQuery = useTVShowDetailQuery({ imdbId });
  const show = detailQuery.data?.show ?? fallbackShow;
  const seasons = detailQuery.data?.seasons ?? EMPTY_SEASONS;
  const resolvedSeasonNumber = activeSeason ?? seasons[0]?.seasonNumber ?? 1;
  const seasonReady = activeSeason !== undefined || seasons.length > 0;

  const seasonQuery = useTVShowSeasonQuery({
    imdbId,
    seasonNumber: resolvedSeasonNumber,
    enabled: seasonReady,
  });
  const downloadsQuery = useTVShowSeasonDownloadsQuery({
    imdbId,
    seasonNumber: resolvedSeasonNumber,
    enabled: seasonReady,
  });

  const downloadsByEpisode = useMemo(
    () =>
      new Map(
        (downloadsQuery.data?.episodes ?? []).map((episode) => [
          episode.episodeNumber,
          episode.download,
        ]),
      ),
    [downloadsQuery.data?.episodes],
  );

  const selectedSeason =
    seasonQuery.data?.season ??
    seasons.find((season) => season.seasonNumber === resolvedSeasonNumber);
  const backdropUrl = detailQuery.data?.show?.backdropUrl;
  const posterUrl = show?.posterUrl;
  const genres = detailQuery.data?.show?.genres ?? EMPTY_GENRES;

  return (
    <DetailResponsiveModal
      title={show?.title ?? "TV show details"}
      description="Browse TV show metadata, seasons, and episode download actions."
      onClose={onClose}
    >
      <TvShowDetailContent
        isDesktop={isDesktop}
        show={show}
        genres={genres}
        backdropUrl={backdropUrl}
        posterUrl={posterUrl}
        detailQuery={detailQuery}
        downloadsQuery={downloadsQuery}
        seasonQuery={seasonQuery}
        seasons={seasons}
        resolvedSeasonNumber={resolvedSeasonNumber}
        selectedSeason={selectedSeason}
        downloadsByEpisode={downloadsByEpisode}
        onClose={onClose}
        onSeasonChange={onSeasonChange}
      />
    </DetailResponsiveModal>
  );
}
