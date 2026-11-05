import { useCallback, useId, useState, type ReactNode } from "react";
import { ArrowUpRight, Star } from "lucide-react";

import { ModalCloseButton } from "@/ui/components/modal-close-button";
import { ResponsiveModal } from "@/ui/components/responsive-modal";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Skeleton } from "@/ui/components/ui/skeleton";
import { cn } from "@/ui/lib/cn";
import { DetailBackdropImage, DetailPosterImage } from "@/catalog/components/detail-media";

const DETAIL_GENRE_LIMIT = 2;
const OVERVIEW_CLAMPED_LINES = 3;

export function getDetailGenreTags(genres: readonly string[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const raw of genres) {
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

export function DetailResponsiveModal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ResponsiveModal
      open
      onOpenChange={(open) => !open && onClose()}
      title={title}
      description={description}
      desktopContentClassName="fixed top-6 left-1/2 max-h-[min(calc(100dvh-48px),760px)] w-[min(100vw-1rem,760px)] min-h-0 -translate-x-1/2"
      drawerContentClassName="max-h-[92dvh] overflow-hidden"
      drawerContentVariant="raised"
    >
      {children}
    </ResponsiveModal>
  );
}

export function DetailModalShell({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-detail-modal-shell
      className={
        isDesktop
          ? "h-[min(calc(100dvh-48px),760px)] min-h-0 w-full max-w-[760px] overflow-y-auto rounded-xl border border-border-strong bg-surface p-0 text-fg-1 shadow-modal flex flex-col"
          : "h-[92dvh] min-h-0 w-full overflow-y-auto bg-surface p-0 text-fg-1 flex flex-col"
      }
    >
      {children}
    </div>
  );
}

type DetailModalHeaderProps = {
  backdropUrl?: string;
  posterUrl?: string;
  posterAlt: string;
  closeLabel: string;
  onClose: () => void;
  overview?: string;
  overviewPending?: boolean;
  children: ReactNode;
};

export function DetailModalHeader({
  backdropUrl,
  posterUrl,
  posterAlt,
  closeLabel,
  onClose,
  overview,
  overviewPending = false,
  children,
}: DetailModalHeaderProps) {
  const overviewText = overview?.trim();
  return (
    <div className="relative flex min-h-[200px] shrink-0 items-end overflow-hidden sm:min-h-[220px]">
      <DetailBackdropImage key={backdropUrl ?? "no-backdrop"} url={backdropUrl} />
      <div className="from-surface/20 to-surface/85 absolute inset-x-0 top-0 h-12 bg-linear-to-b sm:h-14" />
      <div className="from-surface/85 to-surface absolute inset-x-0 top-12 bottom-0 bg-linear-to-b sm:top-14" />
      <div className="from-surface/50 absolute inset-0 bg-linear-to-r to-transparent to-60%" />

      <div className="relative z-10 grid w-full grid-cols-[auto_minmax(0,1fr)] items-start sm:grid-rows-[auto_1fr] gap-x-3.5 px-4 pt-12 pb-4 sm:gap-x-4 sm:px-6 sm:pt-14 sm:pb-5">
        <div className="sm:row-span-2">
          {posterUrl ? (
            <DetailPosterImage key={posterUrl} url={posterUrl} alt={posterAlt} />
          ) : (
            <Skeleton className="aspect-[2/3] w-[92px] shrink-0 sm:w-[110px]" />
          )}
        </div>

        <div className="min-w-0">{children}</div>
        {overviewText || overviewPending ? (
          <div className="col-span-2 mt-3 sm:col-span-1 sm:col-start-2">
            {overviewText ? <DetailOverview text={overviewText} /> : <DetailOverviewSkeleton />}
          </div>
        ) : null}
      </div>

      <ModalCloseButton
        onClick={onClose}
        aria-label={closeLabel}
        className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3"
      />
    </div>
  );
}

export function DetailModalHeaderText({
  titleId,
  title,
  metadata,
  children,
}: {
  titleId: string;
  title: string;
  metadata: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="text-fg-1 max-w-[560px]">
      <h2 id={titleId} className="m-0 text-2xl leading-display sm:text-3xl">
        {title}
      </h2>
      <div className="text-fg-2 mt-2 flex flex-wrap items-center gap-2 text-sm/5">{metadata}</div>
      {children}
    </div>
  );
}

export function DetailRatingMeta({ rating }: { rating?: number }) {
  return (
    <span className="flex items-center gap-1">
      <Star className="size-3.5 fill-rating-amber text-rating-amber" strokeWidth={0} />
      <span>{rating ? rating.toFixed(1) : "N/A"}</span>
    </span>
  );
}

export function DetailMetadataSeparator() {
  return <span className="text-fg-4">·</span>;
}

export function DetailYearMeta({ year }: { year?: number }) {
  if (!year) return null;
  return (
    <>
      <DetailMetadataSeparator />
      <span className="text-fg-3">{year}</span>
    </>
  );
}

export function DetailExternalLinkMeta({ url, label = "IMDb" }: { url?: string; label?: string }) {
  if (!url) return null;
  return (
    <>
      <DetailMetadataSeparator />
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-fg-2 hover:text-fg-1 inline-flex min-h-6 items-center gap-0.5 transition-colors"
      >
        <span>{label}</span>
        <ArrowUpRight className="size-3 shrink-0" strokeWidth={1.25} />
      </a>
    </>
  );
}

export function DetailGenreBadges({
  genres,
  className,
}: {
  genres: readonly string[];
  className?: string;
}) {
  if (genres.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {genres.map((genre) => (
        <Badge key={genre} variant="subtle">
          {genre}
        </Badge>
      ))}
    </div>
  );
}

export function DetailModalHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="my-1 h-4 w-40 max-w-full" />
      <Skeleton className="h-6 w-52 max-w-full" />
    </div>
  );
}

export function DetailModalBody({
  children,
  movieScroll = false,
}: {
  children: ReactNode;
  movieScroll?: boolean;
}) {
  const dataProps = movieScroll ? { "data-movie-detail-scroll": true } : {};
  return (
    <div
      {...dataProps}
      data-detail-modal-body
      className={cn(
        "flex min-h-40 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-2.5 pb-6 sm:px-6",
      )}
    >
      {children}
    </div>
  );
}

function DetailOverviewSkeleton() {
  return (
    <div data-detail-overview-skeleton className="flex flex-col gap-2 py-1">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function DetailOverview({ text }: { text: string }) {
  const textId = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const watchOverflow = useCallback((node: HTMLParagraphElement | null) => {
    if (!node) return;
    const measure = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(node).lineHeight);
      setOverflowing(node.scrollHeight > lineHeight * OVERVIEW_CLAMPED_LINES + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    document.fonts.addEventListener("loadingdone", measure);
    void document.fonts.ready.then(measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, []);

  return (
    <div data-detail-overview className="flex items-end gap-1">
      <p
        key={text}
        id={textId}
        ref={watchOverflow}
        className={cn("text-fg-2 m-0 min-w-0 flex-1 text-sm/5", !expanded && "line-clamp-3")}
      >
        {text}
      </p>
      {overflowing ? (
        <Button
          variant="link"
          size="sm"
          aria-expanded={expanded}
          aria-controls={textId}
          aria-label={expanded ? "show less of the synopsis" : "show more of the synopsis"}
          onClick={() => setExpanded((value) => !value)}
          className="ring-offset-surface"
        >
          {expanded ? "less" : "more"}
        </Button>
      ) : null}
    </div>
  );
}
