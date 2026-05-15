import { useCallback, useMemo, useState } from "react";
import { ArrowUpRight, Search, Star, Users, X } from "lucide-react";

import { AddTransferButton } from "@chill-institute/auth/components/add-transfer-button";
import { Button } from "@chill-institute/ui/components/ui/button";
import { IconButton } from "@chill-institute/ui/components/icon-button";
import { ResponsiveModal } from "@chill-institute/ui/components/responsive-modal";
import { UserErrorAlert } from "@chill-institute/auth/components/user-error-alert";
import { Badge } from "@chill-institute/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@chill-institute/ui/components/ui/select";
import { Separator } from "@chill-institute/ui/components/ui/separator";
import { Skeleton } from "@chill-institute/ui/components/ui/skeleton";
import { cn } from "@chill-institute/ui/cn";
import { useIsDesktop } from "@chill-institute/ui/hooks/use-is-desktop";
import { formatAge, formatBytes } from "@chill-institute/ui/lib/format";
import { type Movie, type SearchResult } from "@/lib/types";
import { useMovieSearchQuery } from "@/queries/movies";

const RESULT_SKELETON_SLOTS = Array.from({ length: 6 }, (_, i) => `result-skel-${i}`);

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
    if (tags.length >= 8) break;
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
  const value = result.releaseInfo?.codec.toLowerCase();
  if (value === "x265" || value === "x264") return value;
  return undefined;
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
    <Select<T>
      value={value}
      onValueChange={(next) => {
        if (next != null) onChange(next);
      }}
    >
      <SelectTrigger size="sm" aria-label={label}>
        <SelectValue>{(v) => options.find((o) => o.value === v)?.label ?? null}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function useImageLoadedState() {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);
  // Cached images may not fire onLoad after a key-remount; the ref callback
  // checks `.complete` on attach so we don't flash a skeleton.
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  return { loaded, onLoad, ref };
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

function MovieHeaderText({ movie, metadataTags }: { movie: Movie; metadataTags: string[] }) {
  return (
    <div className="text-fg-1 max-w-[560px]">
      <h2
        id="movie-detail-title"
        className="font-serif text-3xl leading-[1.05] tracking-[-0.01em] m-0 font-normal"
      >
        {movie.title}
      </h2>
      <div className="text-fg-2 mt-2 flex flex-wrap items-center gap-2 text-sm">
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
      </div>
      {metadataTags.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {metadataTags.map((tag) => (
            <Badge key={tag} variant="outline" className="border-border-faint bg-surface-2/50">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MovieDetailContent({ movie, onClose, isDesktop }: Props & { isDesktop: boolean }) {
  const [resolutionFilter, setResolutionFilter] = useState<ResolutionFilterValue>("all");
  const [codecFilter, setCodecFilter] = useState<CodecFilterValue>("all");
  const [sortBy, setSortBy] = useState<SortValue>("seeders");
  const searchQuery = useMovieSearchQuery({ movie, enabled: true });

  const results = useMemo(() => searchQuery.data?.results ?? [], [searchQuery.data]);
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
    ? "h-full min-h-0 w-full max-w-[760px] overflow-hidden rounded-xl border-border-strong bg-surface text-fg-1 border p-0 shadow-modal flex flex-col"
    : "h-full min-h-0 w-full overflow-hidden bg-surface text-fg-1 p-0 flex flex-col";

  return (
    <div className={shellClassName}>
      <div className="relative flex h-[280px] shrink-0 items-end overflow-hidden">
        <BackdropImage key={movie.backdropUrl ?? "no-backdrop"} url={movie.backdropUrl} />
        <div className="from-surface via-surface/78 absolute inset-0 bg-linear-to-t via-30% to-transparent" />
        <div className="from-surface/48 absolute inset-0 bg-linear-to-r to-transparent to-60%" />

        <div className="relative z-10 flex w-full items-end gap-5 px-6 pb-6 sm:px-7">
          {movie.posterUrl ? (
            <PosterImage key={movie.posterUrl} url={movie.posterUrl} alt={movie.title} />
          ) : (
            <Skeleton className="aspect-[2/3] w-[110px] shrink-0 rounded" />
          )}

          <div className="min-w-0 flex-1">
            <MovieHeaderText movie={movie} metadataTags={metadataTags} />
          </div>
        </div>

        <IconButton
          onClick={onClose}
          aria-label="Close movie details"
          className="absolute right-3 top-3 z-20 rounded-full bg-surface/80 backdrop-blur-sm text-fg-1 hover-hover:hover:bg-surface"
        >
          <X />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-6 pt-5 pb-6">
        {synopsis ? (
          <p className="m-0 text-sm leading-relaxed text-pretty text-fg-2">{synopsis}</p>
        ) : null}

        <Separator className="bg-border-faint" />

        {searchQuery.status === "pending" ? (
          <div className="border-border-soft bg-surface-2 overflow-hidden rounded border">
            {RESULT_SKELETON_SLOTS.map((slot) => (
              <div
                key={slot}
                className="flex items-center gap-3 border-t border-border-strong/10 dark:border-border-strong/30 p-3 first:border-t-0"
              >
                <Skeleton className="h-3 w-14 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-7 w-28 rounded" />
              </div>
            ))}
          </div>
        ) : searchQuery.status === "error" ? (
          <div className="space-y-2">
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
              visibleCount={visibleResults.length}
              totalCount={results.length}
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
                  <p className="m-0 text-[0.8125rem] text-fg-3">
                    results came back, but none include a usable transfer link yet.
                  </p>
                ) : null}

                <ul
                  aria-label="Torrent results list"
                  className="border-border-soft bg-surface-2 m-0 list-none overflow-hidden rounded border p-0"
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
                          <div className="break-words text-[0.8125rem] font-medium text-fg-1">
                            {result.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] text-fg-3">
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
  visibleCount,
  totalCount,
  onResolutionChange,
  onCodecChange,
  onSortChange,
  onClearFilters,
}: {
  resolutionFilter: ResolutionFilterValue;
  codecFilter: CodecFilterValue;
  sortBy: SortValue;
  hasActiveFilters: boolean;
  visibleCount: number;
  totalCount: number;
  onResolutionChange: (value: ResolutionFilterValue) => void;
  onCodecChange: (value: CodecFilterValue) => void;
  onSortChange: (value: SortValue) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
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
      <p className="m-0 self-end pb-0.5 font-mono text-[0.6875rem] leading-none tabular-nums text-fg-3">
        {visibleCount}
        {visibleCount !== totalCount ? ` of ${totalCount}` : ""} result
        {visibleCount === 1 ? "" : "s"}
      </p>
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
      desktopContentClassName="fixed top-1/2 left-1/2 h-[min(calc(100dvh-48px),760px)] w-[min(100vw-1rem,760px)] min-h-0 -translate-x-1/2 -translate-y-1/2 border-0 bg-transparent p-0 shadow-none"
      drawerContentClassName="!max-h-[92dvh] border-0 bg-transparent p-0"
    >
      <MovieDetailContent key={movie.id} movie={movie} onClose={onClose} isDesktop={isDesktop} />
    </ResponsiveModal>
  );
}
