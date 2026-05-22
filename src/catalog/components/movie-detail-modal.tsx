import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Search, Star, Users } from "lucide-react";

import { AddTransferButton } from "@/auth/components/add-transfer-button";
import { normalizeCodecFilterValue } from "@/api/release-info";
import { Button } from "@/ui/components/ui/button";
import { NativeSelect } from "@/ui/components/ui/native-select";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { UserErrorAlert } from "@/auth/components/user-error-alert";
import { Badge } from "@/ui/components/ui/badge";
import { Separator } from "@/ui/components/ui/separator";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";
import { useIsDesktop } from "@/ui/hooks/use-is-desktop";
import { formatAge, formatBytes } from "@/ui/lib/format";
import { type Movie, type SearchResult } from "@/catalog/lib/types";
import { useMovieSearchQuery } from "@/catalog/queries/movies";
import { DetailModalHeader, DetailModalHeaderText } from "@/catalog/components/detail-modal-header";

const RESULT_SKELETON_SLOTS = Array.from({ length: 6 }, (_, i) => `result-skel-${i}`);
const EMPTY_RESULTS: SearchResult[] = [];
const DETAIL_GENRE_LIMIT = 2;

const UPLOADED_AT_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const SEEDER_FORMATTER = new Intl.NumberFormat();

type Props = {
  movie: Movie;
  onClose: () => void;
};

const RESOLUTION_FILTER_OPTIONS = ["all", "2160p", "1080p", "720p"] as const;
const CODEC_FILTER_OPTIONS = ["all", "x265", "x264"] as const;
const SORT_OPTIONS = ["seeders", "size", "age"] as const;

type ResolutionFilterValue = (typeof RESOLUTION_FILTER_OPTIONS)[number];
type CodecFilterValue = (typeof CODEC_FILTER_OPTIONS)[number];
type SortValue = (typeof SORT_OPTIONS)[number];

function buildMetadataTags(movie: Movie): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of movie.genres) {
    if (tags.length >= DETAIL_GENRE_LIMIT) break;
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(value);
  }
  return tags;
}

type ParsedResult = {
  result: SearchResult;
  resolution?: Exclude<ResolutionFilterValue, "all">;
  codec?: Exclude<CodecFilterValue, "all">;
  uploadedAtTimestamp: number;
};

function formatUploadedAt(value: string) {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return UPLOADED_AT_FORMATTER.format(date);
}

function formatResultAge(value: string) {
  if (!value) {
    return undefined;
  }

  const age = formatAge(value);
  if (age === "unknown") {
    return undefined;
  }

  return age === "Today" ? age : `${age} ago`;
}

function formatSeederCount(seeders: bigint) {
  if (seeders <= 0n) {
    return undefined;
  }

  const count = Number(seeders);
  const formattedCount = SEEDER_FORMATTER.format(count);
  return `${formattedCount} seeder${count === 1 ? "" : "s"}`;
}

function canSendResult(result: SearchResult) {
  return result.link.trim().length > 0;
}

function compareBigintsDescending(left: bigint, right: bigint) {
  if (left === right) {
    return 0;
  }

  return left > right ? -1 : 1;
}

function parseResolution(result: {
  releaseInfo?: { resolution: string } | undefined;
}): ParsedResult["resolution"] {
  const value = result.releaseInfo?.resolution.toLowerCase();
  if (value === "2160p" || value === "1080p" || value === "720p") return value;
  return undefined;
}

function parseCodec(result: {
  releaseInfo?: { codec: string } | undefined;
}): ParsedResult["codec"] {
  return normalizeCodecFilterValue(result.releaseInfo?.codec);
}

function parseUploadedAtTimestamp(uploadedAt: string) {
  if (!uploadedAt) {
    return 0;
  }

  const timestamp = new Date(uploadedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <NativeSelect
      aria-label={label}
      name={label.toLowerCase()}
      value={value}
      wrapperClassName="block w-[9.75rem] max-w-full sm:w-fit"
      className="h-8 py-1.5 text-sm whitespace-nowrap"
      onChange={(event) => {
        const next = options.find((option) => option.value === event.currentTarget.value);
        if (next) onChange(next.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </NativeSelect>
  );
}

function MovieHeaderText({ movie, metadataTags }: { movie: Movie; metadataTags: string[] }) {
  return (
    <DetailModalHeaderText
      titleId="movie-detail-title"
      title={movie.title}
      metadata={
        <>
          <span className="flex items-center gap-1">
            <Star className="size-3.5 fill-rating-amber text-rating-amber" strokeWidth={0} />
            <span>{movie.rating ? movie.rating.toFixed(1) : "N/A"}</span>
          </span>
          {movie.year ? (
            <>
              <span className="text-fg-4">·</span>
              <span className="text-fg-3">{movie.year}</span>
            </>
          ) : null}
          {movie.externalUrl ? (
            <>
              <span className="text-fg-4">·</span>
              <a
                href={movie.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="text-fg-2 hover:text-fg-1 inline-flex items-center gap-0.5 transition-colors"
              >
                <span>IMDb</span>
                <ArrowUpRight className="text-xs" strokeWidth={1.25} />
              </a>
            </>
          ) : null}
        </>
      }
    >
      {metadataTags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {metadataTags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-border-faint bg-surface-2/50">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </DetailModalHeaderText>
  );
}

function MovieSynopsis({ children }: { children: string }) {
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);

  useLayoutEffect(() => {
    const paragraph = paragraphRef.current;
    if (!paragraph || expanded) return;

    const measure = () => {
      setCanCollapse(paragraph.scrollHeight > paragraph.clientHeight + 1);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(paragraph);
    return () => observer.disconnect();
  }, [children, expanded]);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <p
        ref={paragraphRef}
        className={cn(
          "m-0 text-[0.9375rem]/6 text-pretty text-fg-2 sm:text-sm sm:leading-relaxed",
          !expanded && "line-clamp-3",
        )}
      >
        {children}
      </p>
      {canCollapse ? (
        <Button
          variant="link"
          size="sm"
          className="h-auto min-h-0 p-0 text-sm text-fg-4 hover:text-fg-2 sm:text-xs"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "show less" : "read more"}
        </Button>
      ) : null}
    </div>
  );
}

function MovieDetailContent({ movie, onClose, isDesktop }: Props & { isDesktop: boolean }) {
  const [resolutionFilter, setResolutionFilter] = useState<ResolutionFilterValue>("all");
  const [codecFilter, setCodecFilter] = useState<CodecFilterValue>("all");
  const [sortBy, setSortBy] = useState<SortValue>("seeders");
  const searchQuery = useMovieSearchQuery({ movie, enabled: true });

  const results = searchQuery.data?.results ?? EMPTY_RESULTS;
  const synopsis = movie.overview?.trim() || undefined;
  const metadataTags = useMemo(() => buildMetadataTags(movie), [movie]);
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
  const { visibleResults, sendableResultsCount } = useMemo(() => {
    const filtered = parsedResults.filter((entry) => {
      if (resolutionFilter !== "all" && entry.resolution !== resolutionFilter) return false;
      if (codecFilter !== "all" && entry.codec !== codecFilter) return false;
      return true;
    });
    const sorted = filtered.toSorted((left, right) => {
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
    let sendable = 0;
    for (const entry of sorted) {
      if (canSendResult(entry.result)) sendable++;
    }
    return { visibleResults: sorted, sendableResultsCount: sendable };
  }, [parsedResults, resolutionFilter, codecFilter, sortBy]);
  const hasOnlyUnavailableResults = visibleResults.length > 0 && sendableResultsCount === 0;
  const hasActiveFilters = resolutionFilter !== "all" || codecFilter !== "all";
  const shellClassName = isDesktop
    ? "max-h-[min(calc(100dvh-48px),760px)] min-h-0 w-full max-w-[760px] overflow-hidden rounded-xl border-border-strong bg-surface text-fg-1 border p-0 shadow-modal flex flex-col"
    : "h-full min-h-0 w-full overflow-hidden bg-surface text-fg-1 p-0 flex flex-col";
  const bodyClassName = cn(
    "flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4 pt-5 pb-6 sm:px-6",
    isDesktop ? "max-h-[calc(min(calc(100dvh-48px),760px)-220px)]" : "flex-1",
  );

  return (
    <div className={shellClassName}>
      <DetailModalHeader
        backdropUrl={movie.backdropUrl}
        posterUrl={movie.posterUrl}
        posterAlt={movie.title}
        closeLabel="Close movie details"
        onClose={onClose}
      >
        <MovieHeaderText movie={movie} metadataTags={metadataTags} />
      </DetailModalHeader>

      <div data-movie-detail-scroll className={bodyClassName}>
        {synopsis ? <MovieSynopsis key={synopsis}>{synopsis}</MovieSynopsis> : null}

        <Separator className="bg-border-faint" />

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
          <EmptyResults
            title="no torrent results found"
            body="searched by movie title and year, but nothing usable came back yet."
          />
        ) : (
          <>
            <ResultsToolbar
              resolutionFilter={resolutionFilter}
              codecFilter={codecFilter}
              sortBy={sortBy}
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
              <EmptyResults
                title="no results match these filters"
                body="try a different resolution or codec to widen the result set."
              />
            ) : (
              <>
                {hasOnlyUnavailableResults ? (
                  <p className="m-0 text-sm text-fg-3">
                    results came back, but none include a usable transfer link yet.
                  </p>
                ) : null}

                <ul
                  aria-label="Torrent results list"
                  className="border-border-soft bg-surface-2 m-0 shrink-0 list-none overflow-hidden rounded border p-0"
                >
                  {visibleResults.map(({ result, resolution, codec }) => {
                    const isSendable = canSendResult(result);
                    const ageLabel = formatResultAge(result.uploadedAt);
                    const uploadedAtLabel = result.uploadedAt
                      ? formatUploadedAt(result.uploadedAt)
                      : undefined;
                    const sizeLabel = result.size > 0n ? formatBytes(result.size) : undefined;
                    const seederLabel = formatSeederCount(result.seeders);

                    return (
                      <li
                        key={result.id || `${result.title}-${result.link}`}
                        className={cn(
                          "border-border-faint flex flex-col gap-3 border-t px-3 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between",
                          !isSendable && "opacity-70",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="break-words text-sm font-medium text-fg-1">
                            {result.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-fg-3">
                            <span className="text-fg-2">
                              {result.indexer || result.source || "unknown"}
                            </span>
                            {resolution ? (
                              <>
                                <span>·</span>
                                <span>{resolution}</span>
                              </>
                            ) : null}
                            {codec ? (
                              <>
                                <span>·</span>
                                <span>{codec}</span>
                              </>
                            ) : null}
                            {sizeLabel ? (
                              <>
                                <span>·</span>
                                <span className="tabular-nums">{sizeLabel}</span>
                              </>
                            ) : null}
                            {seederLabel ? (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 tabular-nums">
                                  <Users className="size-3" />
                                  {seederLabel}
                                </span>
                              </>
                            ) : null}
                            {ageLabel ? (
                              <>
                                <span>·</span>
                                <span title={uploadedAtLabel}>{ageLabel}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {isSendable ? (
                            <AddTransferButton className="w-full sm:w-auto" url={result.link}>
                              send to put.io
                            </AddTransferButton>
                          ) : (
                            <Button
                              variant="off"
                              disabled
                              className="w-full sm:w-auto"
                              aria-label={`Cannot send ${result.title} to put.io`}
                              title="This result is missing a usable transfer link"
                            >
                              unavailable
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultsToolbar({
  resolutionFilter,
  codecFilter,
  sortBy,
  hasActiveFilters,
  onResolutionChange,
  onCodecChange,
  onSortChange,
  onClearFilters,
}: {
  resolutionFilter: ResolutionFilterValue;
  codecFilter: CodecFilterValue;
  sortBy: SortValue;
  hasActiveFilters: boolean;
  onResolutionChange: (value: ResolutionFilterValue) => void;
  onCodecChange: (value: CodecFilterValue) => void;
  onSortChange: (value: SortValue) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex flex-wrap items-end gap-2">
        <FilterSelect
          label="Resolution"
          value={resolutionFilter}
          onChange={onResolutionChange}
          options={RESOLUTION_FILTER_OPTIONS.map((value) => ({
            value,
            label: value === "all" ? "all resolutions" : value,
          }))}
        />
        <FilterSelect
          label="Codec"
          value={codecFilter}
          onChange={onCodecChange}
          options={CODEC_FILTER_OPTIONS.map((value) => ({
            value,
            label: value === "all" ? "all codecs" : value,
          }))}
        />
        <FilterSelect<SortValue>
          label="Sort"
          value={sortBy}
          onChange={onSortChange}
          options={[
            { value: "seeders", label: "most seeders" },
            { value: "size", label: "largest size" },
            { value: "age", label: "newest first" },
          ]}
        />
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function EmptyResults({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-border-soft bg-surface-2 text-fg-2 rounded border px-4 py-6 text-sm">
      <div className="flex items-center gap-2 font-medium text-fg-1">
        <Search className="size-4" />
        <span>{title}</span>
      </div>
      <p className="m-0 mt-2">{body}</p>
    </div>
  );
}

export function MovieDetailModal({ movie, onClose }: Props) {
  const isDesktop = useIsDesktop();
  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${movie.title} details`}
      description={`Torrent results for ${movie.title} (${movie.year})`}
      desktopContentClassName="fixed top-1/2 left-1/2 max-h-[min(calc(100dvh-48px),760px)] w-[min(100vw-1rem,760px)] min-h-0 -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none"
      drawerContentClassName="!max-h-[92dvh] rounded-t-3xl border-x-0 border-t-0 border-b-0 bg-surface p-0 shadow-drawer"
    >
      <MovieDetailContent key={movie.id} movie={movie} onClose={onClose} isDesktop={isDesktop} />
    </ResponsiveModal>
  );
}
