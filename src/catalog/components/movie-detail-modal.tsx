import { useMemo } from "react";

import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { useIsDesktop } from "@/ui/hooks/use-is-desktop";
import { type Movie, type SearchResult } from "@/catalog/lib/types";
import { useMovieSearchQuery } from "@/catalog/queries/movies";
import { useSaveSettings, useSettingsQuery } from "@/queries/settings";
import { QuickFilters } from "@/components/quick-filters";
import { useSearchFilters } from "@/hooks/use-search-filters";
import { formatSearchResults } from "@/lib/search";
import { applyChillSettingsPatch, toChillSettings, type ChillSettings } from "@/lib/types";
import { TorrentResultList, TorrentResultsEmpty } from "@/components/torrent-results";
import {
  DetailModalBody,
  DetailModalShell,
  DetailExternalLinkMeta,
  DetailGenreBadges,
  DetailModalHeader,
  DetailModalHeaderText,
  DetailRatingMeta,
  DetailResponsiveModal,
  DetailYearMeta,
  getDetailGenreTags,
} from "@/catalog/components/detail-modal";

const RESULT_SKELETON_SLOTS = Array.from({ length: 6 }, (_, i) => `result-skel-${i}`);
const EMPTY_RESULTS: SearchResult[] = [];

type Props = {
  movie: Movie;
  onClose: () => void;
};

function MovieHeaderText({ movie, metadataTags }: { movie: Movie; metadataTags: string[] }) {
  const metadata = useMemo(
    () => (
      <>
        <DetailRatingMeta rating={movie.rating} />
        <DetailYearMeta year={movie.year} />
        <DetailExternalLinkMeta url={movie.externalUrl} />
      </>
    ),
    [movie.externalUrl, movie.rating, movie.year],
  );

  return (
    <DetailModalHeaderText titleId="movie-detail-title" title={movie.title} metadata={metadata}>
      <DetailGenreBadges genres={metadataTags} className="mt-2" />
    </DetailModalHeaderText>
  );
}

function MovieDetailContent({ movie, onClose, isDesktop }: Props & { isDesktop: boolean }) {
  const settingsQuery = useSettingsQuery();
  const appSettings = useMemo(
    () => (settingsQuery.data ? toChillSettings(settingsQuery.data) : undefined),
    [settingsQuery.data],
  );
  const { filters, setResolution, setCodec, setSort } = useSearchFilters(appSettings, movie.id);
  const saveSettingsMutation = useSaveSettings();
  const searchQuery = useMovieSearchQuery({ movie });

  // The modal shows QuickFilters as soon as the torrent search returns, which can be
  // before settings finish loading. The save mutation resolves the base settings itself
  // (cache, else a server fetch), so this must not bail out when settingsQuery.data is
  // still pending — otherwise a change made in that window would be silently dropped.
  function patchConfig(patch: Partial<ChillSettings>) {
    saveSettingsMutation.mutate((settings) => applyChillSettingsPatch(settings, patch));
  }

  const results = searchQuery.data?.results ?? EMPTY_RESULTS;
  const metadataTags = useMemo(() => getDetailGenreTags(movie.genres), [movie.genres]);
  const visibleResults = useMemo(
    () =>
      formatSearchResults(
        results,
        filters.resolution,
        filters.codec,
        filters.other,
        filters.sortBy,
        filters.sortDirection,
      ),
    [
      results,
      filters.resolution,
      filters.codec,
      filters.other,
      filters.sortBy,
      filters.sortDirection,
    ],
  );

  return (
    <DetailModalShell isDesktop={isDesktop}>
      <DetailModalHeader
        backdropUrl={movie.backdropUrl}
        posterUrl={movie.posterUrl}
        posterAlt={movie.title}
        closeLabel="Close movie details"
        onClose={onClose}
      >
        <MovieHeaderText movie={movie} metadataTags={metadataTags} />
      </DetailModalHeader>

      <DetailModalBody movieScroll>
        {searchQuery.status === "pending" ? (
          <div className="border-border-soft bg-surface-2 overflow-hidden rounded border">
            {RESULT_SKELETON_SLOTS.map((slot) => (
              <div
                key={slot}
                className="border-border-faint flex items-center gap-3 border-t p-3 first:border-t-0"
              >
                <Skeleton className="h-3 w-14 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-7 w-28 rounded" />
              </div>
            ))}
          </div>
        ) : searchQuery.status === "error" ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-fg-2">
              couldn&apos;t load torrent matches for this movie yet.
            </p>
            <UserErrorAlert error={searchQuery.error} />
          </div>
        ) : results.length === 0 ? (
          <TorrentResultsEmpty
            title="no torrent results found"
            body="searched by movie title and year, but nothing usable came back yet."
          />
        ) : (
          <>
            <QuickFilters
              filters={filters}
              onResolutionChange={(next) => {
                setResolution(next);
                if (appSettings?.rememberQuickFilters) patchConfig({ resolutionFilters: next });
              }}
              onCodecChange={(next) => {
                setCodec(next);
                if (appSettings?.rememberQuickFilters) patchConfig({ codecFilters: next });
              }}
              onSortChange={(next) => {
                setSort(next);
                patchConfig({ sortBy: next.sortBy, sortDirection: next.sortDirection });
              }}
            />

            {visibleResults.length === 0 ? (
              <TorrentResultsEmpty
                title="no results match these filters"
                body="try a different resolution or codec to widen the result set."
              />
            ) : (
              <TorrentResultList results={visibleResults} columns={false} />
            )}
          </>
        )}
      </DetailModalBody>
    </DetailModalShell>
  );
}

export function MovieDetailModal({ movie, onClose }: Props) {
  const isDesktop = useIsDesktop();
  return (
    <DetailResponsiveModal
      title={`${movie.title} details`}
      description={`Torrent results for ${movie.title} (${movie.year})`}
      onClose={onClose}
    >
      <MovieDetailContent key={movie.id} movie={movie} onClose={onClose} isDesktop={isDesktop} />
    </DetailResponsiveModal>
  );
}
