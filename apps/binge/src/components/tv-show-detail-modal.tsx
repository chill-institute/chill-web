import { useMemo, useState } from "react";
import { ArrowUpRight, CloudUpload, Loader2, Star, X } from "lucide-react";

import { AddTransferButton } from "@chill-institute/auth/components/add-transfer-button";
import { TVShowStatusBadge } from "@/components/tv-show-status-badge";
import { Tabs, TabsList, TabsTrigger } from "@chill-institute/ui/components/ui/tabs";
import { Badge } from "@chill-institute/ui/components/ui/badge";
import { Button } from "@chill-institute/ui/components/ui/button";
import { IconButton } from "@chill-institute/ui/components/icon-button";
import { ResponsiveModal } from "@chill-institute/ui/components/responsive-modal";
import { UserErrorAlert } from "@chill-institute/auth/components/user-error-alert";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";
import { cn } from "@chill-institute/ui/cn";
import { useIsDesktop } from "@chill-institute/ui/hooks/use-is-desktop";
import { formatBytes } from "@chill-institute/ui/lib/format";
import { type TVShow } from "@/lib/types";
import {
  useTVShowDetailQuery,
  useTVShowSeasonDownloadsQuery,
  useTVShowSeasonQuery,
} from "@/queries/tv-shows";

const SEASON_TAB_SKELETON_SLOTS = Array.from({ length: 3 }, (_, i) => `season-tab-skel-${i}`);
const EPISODE_SKELETON_SLOTS = Array.from({ length: 6 }, (_, i) => `episode-skel-${i}`);

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

function useImageLoadedState() {
  const [loaded, setLoaded] = useState(false);
  // Cached images may not fire onLoad after key-remount; check `.complete`
  // when the <img> mounts and pre-set loaded so we don't flash a skeleton.
  const ref = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  };
  return { loaded, onLoad: () => setLoaded(true), ref };
}

function BackdropImage({ url }: { url?: string }) {
  const img = useImageLoadedState();
  if (!url) return <div className="absolute inset-0 bg-app" />;
  return (
    <>
      <Skeleton
        className={cn(
          "absolute inset-0 h-full w-full rounded-none transition-opacity duration-base ease-out",
          img.loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        ref={img.ref}
        src={url}
        alt=""
        aria-hidden="true"
        onLoad={img.onLoad}
        className={cn(
          "absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-slow ease-out",
          img.loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </>
  );
}

function PosterImage({ url, alt }: { url: string; alt: string }) {
  const img = useImageLoadedState();
  return (
    <div className="relative aspect-[2/3] w-[110px] shrink-0">
      <Skeleton
        className={cn(
          "absolute inset-0 h-full w-full rounded transition-opacity duration-base ease-out",
          img.loaded ? "opacity-0" : "opacity-100",
        )}
      />
      <img
        ref={img.ref}
        src={url}
        alt={alt}
        onLoad={img.onLoad}
        className={cn(
          "absolute inset-0 h-full w-full border-border-strong rounded border object-cover shadow-poster transition-opacity duration-slow ease-out",
          img.loaded ? "opacity-100" : "opacity-0",
        )}
      />
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

  const closeButton = (
    <IconButton
      onClick={onClose}
      aria-label="Close TV show details"
      className="absolute right-3 top-3 z-20 rounded-full bg-surface/80 backdrop-blur-sm text-fg-1 hover-hover:hover:bg-surface"
    >
      <X />
    </IconButton>
  );

  const shellClassName = isDesktop
    ? "h-full min-h-0 w-full max-w-[760px] overflow-hidden rounded-xl border-border-strong bg-surface text-fg-1 border border-solid p-0 shadow-modal flex flex-col"
    : "h-full min-h-0 w-full overflow-hidden bg-surface text-fg-1 p-0 flex flex-col";

  return (
    <div className={shellClassName}>
      <div className="relative flex h-[280px] shrink-0 items-end overflow-hidden">
        <BackdropImage key={backdropUrl ?? "no-backdrop"} url={backdropUrl} />
        <div className="from-surface via-surface/78 absolute inset-0 bg-linear-to-t via-30% to-transparent" />
        <div className="from-surface/48 absolute inset-0 bg-linear-to-r to-transparent to-60%" />

        <div className="relative z-10 flex w-full items-end gap-5 px-6 pb-6 sm:px-7">
          {posterUrl ? (
            <PosterImage key={posterUrl} url={posterUrl} alt={show?.title ?? "TV show poster"} />
          ) : (
            <Skeleton className="aspect-[2/3] w-[110px] shrink-0 rounded" />
          )}

          <div className="min-w-0 flex-1">
            {show ? (
              <div className="text-fg-1 max-w-[520px]">
                <p className="font-serif text-3xl leading-[1.05] tracking-[-0.01em] m-0">
                  {show.title}
                </p>
                <div className="text-fg-2 mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex items-center gap-1">
                    <Star
                      className="size-3.5 fill-rating-amber text-rating-amber"
                      strokeWidth={0}
                    />
                    <span>{show.rating ? show.rating.toFixed(1) : "N/A"}</span>
                  </span>
                  {show.year ? (
                    <>
                      <span className="text-fg-4">·</span>
                      <span className="text-fg-3">{show.year}</span>
                    </>
                  ) : null}
                  <span className="text-fg-4">·</span>
                  <span className="text-fg-3">
                    {detailQuery.data?.show?.seasonCount ?? show.seasonCount} seasons
                  </span>
                  {show.externalUrl ? (
                    <>
                      <span className="text-fg-4">·</span>
                      <a
                        href={show.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-fg-2 hover:text-fg-1 inline-flex items-center gap-0.5 transition-colors"
                      >
                        <span>IMDb</span>
                        <ArrowUpRight className="text-xs" strokeWidth={1.25} />
                      </a>
                    </>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TVShowStatusBadge status={detailQuery.data?.show?.status ?? show.status} />
                  {genres.length > 0 ? (
                    <>
                      <span className="text-fg-4">·</span>
                      <div className="flex flex-wrap items-center gap-2">
                        {genres.map((genre) => (
                          <Badge
                            key={genre}
                            variant="outline"
                            className="border-border-faint bg-surface-2/50"
                          >
                            {genre}
                          </Badge>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-52" />
              </div>
            )}
          </div>
        </div>
        {closeButton}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {detailQuery.status === "error" ? (
          <UserErrorAlert className="mt-5" error={detailQuery.error} />
        ) : null}

        {show?.overview ? (
          <p className="text-fg-2 mt-5 text-sm leading-relaxed">{show.overview}</p>
        ) : detailQuery.isPending ? (
          <div className="mt-5 flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[80%]" />
          </div>
        ) : null}

        <div
          className={cn(
            "border-border-strong mt-5 border-t pt-5 transition-opacity duration-base ease-out",
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
              <TabsList className="mb-4 flex-wrap gap-1">
                {seasons.map((season) => (
                  <TabsTrigger
                    key={season.seasonNumber}
                    value={String(season.seasonNumber)}
                    className="h-6 px-2 font-mono text-xs"
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
                <div className="text-sm font-medium">
                  {selectedSeason.name || `Season ${selectedSeason.seasonNumber}`}
                </div>
                <div className="mt-1 text-xs text-fg-3">
                  {selectedSeason.episodeCount} episodes
                  <span className="mx-1.5">·</span>
                  {formatAirDate(selectedSeason.airDate)}
                  {downloadsQuery.data?.seasonPack?.size ? (
                    <>
                      <span className="mx-1.5">·</span>
                      {formatBytes(downloadsQuery.data.seasonPack.size)}
                    </>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:flex-nowrap">
                {downloadsQuery.isPending ? (
                  <Button disabled>
                    <Loader2 className="motion-safe:animate-spin" />
                    <span>loading downloads</span>
                  </Button>
                ) : downloadsQuery.data?.seasonPack?.link ? (
                  <AddTransferButton
                    url={downloadsQuery.data.seasonPack.link}
                    ariaLabel={`Send ${show?.title ?? "TV show"} season ${resolvedSeasonNumber} to put.io`}
                  >
                    send season to put.io
                  </AddTransferButton>
                ) : (
                  <Button variant="off" disabled>
                    <CloudUpload />
                    <span>season pack unavailable</span>
                  </Button>
                )}
              </div>
            </div>
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
                  <Skeleton className="h-3 w-6 rounded" />
                  <div className="flex-1 space-y-1">
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
                    <span className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-fg-3">
                      e{paddedEpisode}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.8125rem] text-fg-1">
                        {episode.name || `episode ${episode.episodeNumber}`}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-2 font-mono text-[0.6875rem] text-fg-3">
                        <span>{formatAirDate(episode.airDate)}</span>
                        {episode.runtime ? <span>· {episode.runtime}m</span> : null}
                        {episode.rating ? <span>· ★ {episode.rating.toFixed(1)}</span> : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {downloadsQuery.isPending ? (
                        <EpisodeActionSkeleton />
                      ) : episodeDownload?.link ? (
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
      </div>
    </div>
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
  const detailQuery = useTVShowDetailQuery({ imdbId, enabled: true });
  const show = detailQuery.data?.show ?? fallbackShow;
  const seasons = detailQuery.data?.seasons ?? [];
  const resolvedSeasonNumber = activeSeason ?? seasons[0]?.seasonNumber ?? 1;

  const seasonQuery = useTVShowSeasonQuery({
    imdbId,
    seasonNumber: resolvedSeasonNumber,
    enabled: seasons.length > 0,
  });
  const downloadsQuery = useTVShowSeasonDownloadsQuery({
    imdbId,
    seasonNumber: resolvedSeasonNumber,
    enabled: seasons.length > 0,
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
  const genres = detailQuery.data?.show?.genres ?? [];

  const content = (
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
  );

  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && onClose()}
      title={show?.title ?? "TV show details"}
      description="Browse TV show metadata, seasons, and episode download actions."
      desktopContentClassName="fixed top-1/2 left-1/2 h-[min(calc(100dvh-48px),760px)] w-[min(100vw-1rem,760px)] min-h-0 -translate-x-1/2 -translate-y-1/2 gap-0 border-0 bg-transparent p-0 shadow-none"
      drawerContentClassName="!max-h-[92dvh] bg-surface shadow-drawer overflow-hidden rounded-t-3xl border-x-0 border-t-0 border-b-0 p-0"
    >
      {content}
    </ResponsiveModal>
  );
}
