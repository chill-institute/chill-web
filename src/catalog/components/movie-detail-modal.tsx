import { useMemo, useState } from "react";

import { normalizeCodecFilterValue } from "@/api/release-info";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { useIsDesktop } from "@/ui/hooks/use-is-desktop";
import { type Movie, type SearchResult } from "@/catalog/lib/types";
import { useMovieSearchQuery } from "@/catalog/queries/movies";
import { useSettingsQuery } from "@/queries/settings";
import { CodecFilter, ResolutionFilter } from "@/lib/types";
import {
  TorrentResultList,
  TorrentResultToolbar,
  TorrentResultsEmpty,
  type CodecFilterValue,
  type ResolutionFilterValue,
  type ResultSortValue,
} from "@/components/torrent-results";
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

function initialResolutionFilter(
  filters: readonly ResolutionFilter[] | undefined,
): ResolutionFilterValue {
  if (!filters || filters.length !== 1) return "all";
  switch (filters[0]) {
    case ResolutionFilter.RESOLUTION_FILTER_720P:
      return "720p";
    case ResolutionFilter.RESOLUTION_FILTER_1080P:
      return "1080p";
    case ResolutionFilter.RESOLUTION_FILTER_2160P:
      return "2160p";
    default:
      return "all";
  }
}

function initialCodecFilter(filters: readonly CodecFilter[] | undefined): CodecFilterValue {
  if (!filters || filters.length !== 1) return "all";
  switch (filters[0]) {
    case CodecFilter.X264:
      return "x264";
    case CodecFilter.X265:
      return "x265";
    default:
      return "all";
  }
}

type ParsedResult = {
  result: SearchResult;
  resolution?: Exclude<ResolutionFilterValue, "all">;
  codec?: Exclude<CodecFilterValue, "all">;
  uploadedAtTimestamp: number;
};

function parseResolution(result: SearchResult): ParsedResult["resolution"] {
  const value = result.releaseInfo?.resolution.toLowerCase();
  if (value === "2160p" || value === "1080p" || value === "720p") return value;
  return undefined;
}

function parseCodec(result: SearchResult): ParsedResult["codec"] {
  return normalizeCodecFilterValue(result.releaseInfo?.codec);
}

function parseUploadedAtTimestamp(uploadedAt: string) {
  if (!uploadedAt) return 0;
  const timestamp = new Date(uploadedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareBigintsDescending(left: bigint, right: bigint) {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

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
  const remember = settingsQuery.data?.search?.rememberQuickFilters ?? false;
  const settingsResolutionFilter = initialResolutionFilter(
    remember ? settingsQuery.data?.search?.resolutionFilters : undefined,
  );
  const settingsCodecFilter = initialCodecFilter(
    remember ? settingsQuery.data?.search?.codecFilters : undefined,
  );
  const [resolutionFilterOverride, setResolutionFilter] = useState<
    ResolutionFilterValue | undefined
  >();
  const [codecFilterOverride, setCodecFilter] = useState<CodecFilterValue | undefined>();
  const resolutionFilter = resolutionFilterOverride ?? settingsResolutionFilter;
  const codecFilter = codecFilterOverride ?? settingsCodecFilter;
  const [sortBy, setSortBy] = useState<ResultSortValue>("seeders");
  const searchQuery = useMovieSearchQuery({ movie });

  const results = searchQuery.data?.results ?? EMPTY_RESULTS;
  const metadataTags = useMemo(() => getDetailGenreTags(movie.genres), [movie.genres]);
  const parsedResults = useMemo<ParsedResult[]>(
    () =>
      results.map((result) => ({
        result,
        resolution: parseResolution(result),
        codec: parseCodec(result),
        uploadedAtTimestamp: parseUploadedAtTimestamp(result.uploadedAt),
      })),
    [results],
  );
  const visibleResults = useMemo(() => {
    const filtered = parsedResults.filter((entry) => {
      if (resolutionFilter !== "all" && entry.resolution !== resolutionFilter) return false;
      if (codecFilter !== "all" && entry.codec !== codecFilter) return false;
      return true;
    });
    return filtered.toSorted((left, right) => {
      if (sortBy === "size") {
        const sizeOrder = compareBigintsDescending(left.result.size, right.result.size);
        if (sizeOrder !== 0) return sizeOrder;
      }
      if (sortBy === "age") {
        const ageOrder = right.uploadedAtTimestamp - left.uploadedAtTimestamp;
        if (ageOrder !== 0) return ageOrder;
      }
      const seederOrder = compareBigintsDescending(left.result.seeders, right.result.seeders);
      if (seederOrder !== 0) return seederOrder;
      if (sortBy === "seeders") {
        const sizeOrder = compareBigintsDescending(left.result.size, right.result.size);
        if (sizeOrder !== 0) return sizeOrder;
      }
      return left.result.title.localeCompare(right.result.title);
    });
  }, [parsedResults, resolutionFilter, codecFilter, sortBy]);
  const hasActiveFilters = resolutionFilter !== "all" || codecFilter !== "all";

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
            <TorrentResultToolbar
              resolution={resolutionFilter}
              codec={codecFilter}
              sort={sortBy}
              hasActiveFilters={hasActiveFilters}
              onResolutionChange={setResolutionFilter}
              onCodecChange={setCodecFilter}
              onSortChange={setSortBy}
              onClearFilters={() => {
                setResolutionFilter("all");
                setCodecFilter("all");
              }}
            />

            {visibleResults.length === 0 ? (
              <TorrentResultsEmpty
                title="no results match these filters"
                body="try a different resolution or codec to widen the result set."
              />
            ) : (
              <TorrentResultList
                results={visibleResults.map((entry) => entry.result)}
                columns={false}
              />
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
